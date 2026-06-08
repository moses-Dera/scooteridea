import {
  Consumer,
  EachMessagePayload,
  Kafka,
  KafkaConfig,
} from 'kafkajs';
import { TOPICS } from './producer';

export type MessageHandler<T> = (payload: T, raw: EachMessagePayload) => Promise<void>;

/** Create a typed Kafka consumer bound to a single group. */
export function createConsumer(groupId?: string) {
  const kafka = new Kafka({
    clientId: process.env.KAFKA_CLIENT_ID ?? 'ebike-consumer',
    brokers: (process.env.KAFKA_BROKERS ?? 'localhost:9092').split(','),
  } satisfies KafkaConfig);

  const consumer: Consumer = kafka.consumer({
    groupId: groupId ?? process.env.KAFKA_GROUP_ID ?? 'ebike-backend',
  });

  return {
    /** Connect and subscribe to one or more topics, then start processing. */
    async subscribe(
      topics: string[],
      handler: MessageHandler<unknown>,
    ): Promise<void> {
      await consumer.connect();
      for (const topic of topics) {
        await consumer.subscribe({ topic, fromBeginning: false });
      }
      await consumer.run({
        eachMessage: async (raw) => {
          if (!raw.message.value) return;
          const payload = JSON.parse(raw.message.value.toString());
          await handler(payload, raw);
        },
      });
    },
    async disconnect() {
      await consumer.disconnect();
    },
  };
}

export { TOPICS };
