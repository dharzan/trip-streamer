import express from 'express';
import cors from 'cors';
import { randomUUID } from 'crypto';
import { ragConfig } from './config';
import { ensureSchema, fetchAllDocuments, upsertDocument } from './db';
import { textToVector, cosineSimilarity } from './embeddings';
import { z } from 'zod';

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

const ingestSchema = z.object({
  id: z.string().optional(),
  source: z.string().default('unknown'),
  text: z.string().min(10),
  metadata: z.record(z.any()).optional(),
});

app.post('/api/documents', async (req, res) => {
  try {
    const payload = ingestSchema.parse(req.body);
    const embedding = textToVector(payload.text);
    const id = payload.id ?? randomUUID();

    await upsertDocument({
      id,
      source: payload.source,
      text: payload.text,
      embedding,
      metadata: payload.metadata,
    });

    res.json({ status: 'ok', id });
  } catch (error) {
    console.error('[rag-assistant] Failed to ingest document', error);
    res.status(400).json({ error: error instanceof Error ? error.message : 'Invalid payload' });
  }
});

const querySchema = z.object({
  prompt: z.string().min(5),
  topK: z.number().int().min(1).max(10).optional(),
});

app.post('/api/query', async (req, res) => {
  try {
    const { prompt, topK = 3 } = querySchema.parse(req.body);
    const queryVector = textToVector(prompt);
    const docs = await fetchAllDocuments(ragConfig.maxDocuments);

    const ranked = docs
      .map((doc) => ({
        doc,
        score: cosineSimilarity(queryVector, doc.embedding),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);

    const stitchedContext = ranked
      .map((item) => `Source: ${item.doc.source}\nScore: ${item.score.toFixed(3)}\n${item.doc.text}`)
      .join('\n\n');

    const summary = `Prompt: ${prompt}\n\nContextual snippets:\n${stitchedContext || 'No supporting documents yet.'}`;

    res.json({
      prompt,
      topK,
      matches: ranked.map((item) => ({
        id: item.doc.id,
        source: item.doc.source,
        text: item.doc.text,
        metadata: item.doc.metadata,
        score: item.score,
      })),
      synthesizedResponse: summary,
    });
  } catch (error) {
    console.error('[rag-assistant] Query failed', error);
    res.status(400).json({ error: error instanceof Error ? error.message : 'Invalid payload' });
  }
});

app.get('/healthz', (_req, res) => {
  res.json({ status: 'ok', collection: ragConfig.collection });
});

async function start() {
  await ensureSchema();
  app.listen(ragConfig.port, () => {
    console.log(`🧠 RAG assistant listening on http://localhost:${ragConfig.port}`);
  });
}

start().catch((error) => {
  console.error('Failed to start rag-assistant', error);
  process.exit(1);
});
