import { config as loadEnv } from 'dotenv';
import {
  SQSClient,
  CreateQueueCommand,
  GetQueueUrlCommand,
  ReceiveMessageCommand,
  DeleteMessageCommand,
} from '@aws-sdk/client-sqs';
import Redis from 'ioredis';
import { Pool } from 'pg';
import fetch from 'node-fetch';

loadEnv();

const SQS_QUEUE_NAME = process.env.SQS_QUEUE_NAME ?? 'deals-alerts';
const sqs = new SQSClient({
  region: process.env.AWS_REGION ?? 'us-east-1',
  endpoint: process.env.AWS_ENDPOINT ?? 'http://localhost:4566',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? 'test',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? 'test',
  },
});

const pool = new Pool({
  host: process.env.PGHOST ?? 'localhost',
  port: Number(process.env.PGPORT ?? 5432),
  user: process.env.PGUSER ?? 'tripstreamer',
  password: process.env.PGPASSWORD ?? 'tripstreamer',
  database: process.env.PGDATABASE ?? 'tripstreamer',
});

const redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379');
const ragServiceUrl = process.env.RAG_SERVICE_URL ?? 'http://localhost:7070';

interface DealEvent {
  id: string;
  destination: string;
  price: number;
  airline: string;
  createdAt: string;
}

interface DealMessageBody {
  eventId: string;
  deal: DealEvent;
}

async function ensureSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS deals (
      id UUID PRIMARY KEY,
      destination TEXT NOT NULL,
      price NUMERIC NOT NULL,
      airline TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

async function ensureQueueUrl(): Promise<string> {
  try {
    await sqs.send(new CreateQueueCommand({ QueueName: SQS_QUEUE_NAME }));
  } catch (error) {
    console.warn('[sqs-worker] Queue may already exist', error);
  }

  const { QueueUrl } = await sqs.send(new GetQueueUrlCommand({ QueueName: SQS_QUEUE_NAME }));
  if (!QueueUrl) {
    throw new Error('Unable to resolve SQS queue URL');
  }
  return QueueUrl;
}

async function persistDeal(deal: DealEvent) {
  await pool.query(
    `INSERT INTO deals (id, destination, price, airline, created_at)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (id) DO NOTHING`,
    [deal.id, deal.destination, deal.price, deal.airline, deal.createdAt]
  );
}

async function updateStats(destination: string) {
  const result = await pool.query<{ count: string }>(
    'SELECT COUNT(*)::text AS count FROM deals WHERE destination = $1',
    [destination]
  );
  const count = Number(result.rows[0]?.count ?? '0');
  const statsKey = `stats:deals:dest:${destination}`;
  await redis.setex(
    statsKey,
    Number(process.env.DEST_STATS_TTL ?? 60),
    JSON.stringify({ destination, count, updatedAt: new Date().toISOString() })
  );
}

async function notifyRagService(deal: DealEvent) {
  try {
    const response = await fetch(`${ragServiceUrl}/api/documents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source: `deal:${deal.destination}`,
        text: `Deal ${deal.id} to ${deal.destination} for $${deal.price} via ${deal.airline} on ${deal.createdAt}`,
        metadata: {
          type: 'deal',
          destination: deal.destination,
          price: deal.price,
          airline: deal.airline,
          createdAt: deal.createdAt,
        },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.warn('[sqs-worker] RAG service rejected document', errText);
    }
  } catch (error) {
    console.warn('[sqs-worker] Failed to notify RAG service', error);
  }
}

async function handleMessage(queueUrl: string, body: DealMessageBody, receiptHandle: string) {
  const idKey = `event:processed:${body.eventId}`;
  const alreadyProcessed = await redis.get(idKey);
  if (alreadyProcessed) {
    console.log(`[sqs-worker] Duplicate event ${body.eventId}, skipping`);
  } else {
    await persistDeal(body.deal);
    await redis.set(idKey, '1', 'EX', Number(process.env.EVENT_TTL_SECONDS ?? 86400));
    await redis.del('cache:deals:active');
    await updateStats(body.deal.destination);
    await notifyRagService(body.deal);
    console.log(`[sqs-worker] Persisted deal ${body.deal.id}`);
  }

  await sqs.send(
    new DeleteMessageCommand({
      QueueUrl: queueUrl,
      ReceiptHandle: receiptHandle,
    })
  );
}

async function poll(queueUrl: string) {
  while (true) {
    const response = await sqs.send(
      new ReceiveMessageCommand({
        QueueUrl: queueUrl,
        MaxNumberOfMessages: 5,
        WaitTimeSeconds: 10,
        MessageAttributeNames: ['All'],
      })
    );

    const messages = response.Messages ?? [];
    if (messages.length === 0) {
      continue;
    }

    for (const message of messages) {
      if (!message.Body || !message.ReceiptHandle) {
        continue;
      }

      try {
        const body = JSON.parse(message.Body) as DealMessageBody;
        await handleMessage(queueUrl, body, message.ReceiptHandle);
      } catch (error) {
        console.error('[sqs-worker] Failed to process message', error);
      }
    }
  }
}

async function start() {
  await ensureSchema();
  const queueUrl = await ensureQueueUrl();
  console.log(`[sqs-worker] Listening on ${queueUrl}`);
  await poll(queueUrl);
}

start().catch((error) => {
  console.error('[sqs-worker] Fatal error', error);
  process.exit(1);
});
