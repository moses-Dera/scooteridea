import Redis from 'ioredis';
import { TOPICS } from './producer';

export type MessageHandler<T> = (payload: T, raw: string) => Promise<void>;

/** Create a typed Redis subscriber. */
export function createConsumer(groupId?: string) {
  // Redis pub/sub doesn't use consumer groups like Kafka does by default,
  // but if you want persistence, you'd use Redis Streams. For MVP, we use basic Pub/Sub.
  const subscriber = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

  return {
    /** Connect and subscribe to one or more topics, then start processing. */
    async subscribe(topics: string[], handler: MessageHandler<unknown>): Promise<void> {
      await subscriber.subscribe(...topics);

      subscriber.on('message', async (channel, message) => {
        if (!topics.includes(channel)) return;
        try {
          const payload = JSON.parse(message);
          await handler(payload, message);
        } catch (err) {
          console.error(`[Redis Subscriber] Failed to process message from ${channel}`, err);
        }
      });

      console.log(`[Redis Subscriber] Subscribed to ${topics.join(', ')}`);
    },
    async disconnect() {
      await subscriber.quit();
    },
  };
}

export { TOPICS };
