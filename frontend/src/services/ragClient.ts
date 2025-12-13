export interface RagMatch {
  id: string;
  source: string;
  text: string;
  metadata?: Record<string, unknown>;
  score: number;
}

export interface RagQueryResponse {
  prompt: string;
  topK: number;
  matches: RagMatch[];
  synthesizedResponse: string;
}

const ragBaseUrl = (import.meta.env.VITE_RAG_URL ?? 'http://localhost:7070').replace(/\/$/, '');

export async function queryRag(prompt: string, topK = 3): Promise<RagQueryResponse> {
  const response = await fetch(`${ragBaseUrl}/api/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, topK }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || 'RAG query failed');
  }

  return (await response.json()) as RagQueryResponse;
}
