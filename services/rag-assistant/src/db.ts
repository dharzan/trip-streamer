import { Pool } from 'pg';
import { ragConfig } from './config';

export interface RagDocumentRow {
  id: string;
  source: string;
  text: string;
  embedding: number[];
  metadata: Record<string, unknown> | null;
  created_at: Date;
}

export const pool = new Pool(ragConfig.pg);

export async function ensureSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS rag_documents (
      id TEXT PRIMARY KEY,
      source TEXT NOT NULL,
      text TEXT NOT NULL,
      embedding DOUBLE PRECISION[] NOT NULL,
      metadata JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

export async function upsertDocument(row: {
  id: string;
  source: string;
  text: string;
  embedding: number[];
  metadata?: Record<string, unknown>;
}) {
  const metadataJson = row.metadata ?? {};
  await pool.query(
    `INSERT INTO rag_documents (id, source, text, embedding, metadata)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (id)
     DO UPDATE SET source = EXCLUDED.source,
                   text = EXCLUDED.text,
                   embedding = EXCLUDED.embedding,
                   metadata = EXCLUDED.metadata,
                   created_at = NOW()`,
    [row.id, row.source, row.text, row.embedding, metadataJson]
  );
}

export async function fetchAllDocuments(limit: number): Promise<RagDocumentRow[]> {
  const result = await pool.query<RagDocumentRow>(
    'SELECT * FROM rag_documents ORDER BY created_at DESC LIMIT $1',
    [limit]
  );
  return result.rows;
}
