import { Kafka } from 'kafkajs';
import { config as loadEnv } from 'dotenv';
import { randomUUID } from 'crypto';

loadEnv();

const KAFKA_BROKERS = (process.env.KAFKA_BROKERS ?? 'localhost:9092').split(',');
const DEAL_TOPIC = process.env.KAFKA_DEAL_TOPIC ?? 'deals.raw';
const PRODUCE_INTERVAL_MS = Number(process.env.PRODUCE_INTERVAL_MS ?? 3000);

const destinations = ['NYC', 'LON', 'TYO', 'SYD', 'PAR', 'LAX'];
const airlines = ['Delta', 'United', 'Qantas', 'American', 'ANA', 'Air France'];

const kafka = new Kafka({
  clientId: 'tripstreamer-kafka-producer',
  brokers: KAFKA_BROKERS,
});

interface DealEvent {
  id: string;
  destination: string;
  price: number;
  airline: string;
  createdAt: string;
}

function randomItem<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function createDeal(): DealEvent {
  return {
    id: randomUUID(),
    destination: randomItem(destinations),
    price: Number((200 + Math.random() * 600).toFixed(2)),
    airline: randomItem(airlines),
    createdAt: new Date().toISOString(),
  };
}

async function ensureTopic() {
  const admin = kafka.admin();
  await admin.connect();
  try {
    await admin.createTopics({
      waitForLeaders: true,
      topics: [{ topic: DEAL_TOPIC }],
    });
    console.log(`[kafka-producer] Topic ensured: ${DEAL_TOPIC}`);
  } finally {
    await admin.disconnect();
  }
}

async function startProducer() {
  await ensureTopic();
  const producer = kafka.producer();
  await producer.connect();
  console.log('[kafka-producer] Connected to Kafka. Generating deals...');

  async function sendLoop() {
    const deal = createDeal();
    try {
      await producer.send({
        topic: DEAL_TOPIC,
        messages: [{
          key: deal.destination,
          value: JSON.stringify(deal),
          headers: {
            'content-type': 'application/json',
          },
        }],
      });
      console.log(`[kafka-producer] Published deal ${deal.id} (${deal.destination}) at $${deal.price}`);
    } catch (error) {
      console.error('[kafka-producer] Failed to publish deal', error);
    } finally {
      setTimeout(sendLoop, PRODUCE_INTERVAL_MS);
    }
  }

  sendLoop();
}

startProducer().catch((error) => {
  console.error('[kafka-producer] Fatal error', error);
  process.exit(1);
});
