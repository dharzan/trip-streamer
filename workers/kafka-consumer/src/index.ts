import { Kafka } from 'kafkajs';
import { config as loadEnv } from 'dotenv';
import {
  SQSClient,
  CreateQueueCommand,
  GetQueueUrlCommand,
  SendMessageCommand,
} from '@aws-sdk/client-sqs';

loadEnv();

const KAFKA_BROKERS = (process.env.KAFKA_BROKERS ?? 'localhost:9092').split(',');
const DEAL_TOPIC = process.env.KAFKA_DEAL_TOPIC ?? 'deals.raw';
const CONSUMER_GROUP = process.env.KAFKA_CONSUMER_GROUP ?? 'tripstreamer-kafka-consumer';
const PRICE_THRESHOLD = Number(process.env.MAX_ALERT_PRICE ?? 500);
const SQS_QUEUE_NAME = process.env.SQS_QUEUE_NAME ?? 'deals-alerts';

const kafka = new Kafka({
  clientId: 'tripstreamer-kafka-consumer',
  brokers: KAFKA_BROKERS,
});

const sqs = new SQSClient({
  region: process.env.AWS_REGION ?? 'us-east-1',
  endpoint: process.env.AWS_ENDPOINT ?? 'http://localhost:4566',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? 'test',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? 'test',
  },
});

interface DealEvent {
  id: string;
  destination: string;
  price: number;
  airline: string;
  createdAt: string;
}

async function ensureQueueUrl(): Promise<string> {
  try {
    await sqs.send(new CreateQueueCommand({ QueueName: SQS_QUEUE_NAME }));
  } catch (error) {
    console.warn('[kafka-consumer] Queue may already exist', error);
  }

  const response = await sqs.send(
    new GetQueueUrlCommand({ QueueName: SQS_QUEUE_NAME })
  );
  if (!response.QueueUrl) {
    throw new Error('Unable to resolve queue URL');
  }
  return response.QueueUrl;
}

async function start() {
  const queueUrl = await ensureQueueUrl();
  console.log(`[kafka-consumer] Using SQS queue ${queueUrl}`);

  const consumer = kafka.consumer({ groupId: CONSUMER_GROUP });
  await consumer.connect();
  await consumer.subscribe({ topic: DEAL_TOPIC, fromBeginning: true });
  console.log(`[kafka-consumer] Subscribed to ${DEAL_TOPIC}`);

  await consumer.run({
    eachMessage: async ({ message, partition }) => {
      if (!message.value) {
        return;
      }

      try {
        const deal = JSON.parse(message.value.toString()) as DealEvent;
        const isEligible = deal.price <= PRICE_THRESHOLD;
        if (!isEligible) {
          console.log(
            `[kafka-consumer] Skipping deal ${deal.id} at $${deal.price} (> ${PRICE_THRESHOLD})`
          );
          return;
        }

        await sqs.send(
          new SendMessageCommand({
            QueueUrl: queueUrl,
            MessageBody: JSON.stringify({
              eventId: deal.id,
              deal,
            }),
            MessageAttributes: {
              destination: {
                DataType: 'String',
                StringValue: deal.destination,
              },
            },
          })
        );
        console.log(
          `[kafka-consumer] Forwarded deal ${deal.id} (${deal.destination}) from partition ${partition}`
        );
      } catch (error) {
        console.error('[kafka-consumer] Failed to process message', error);
      }
    },
  });
}

start().catch((error) => {
  console.error('[kafka-consumer] Fatal error', error);
  process.exit(1);
});
