import amqp from 'amqplib';
import { TOPICS } from './producer';

export type MessageHandler<T> = (payload: T, raw: string, channel: string) => Promise<void>;

const EXCHANGE = 'scooterfy_events';

/** Create a typed RabbitMQ subscriber. */
export function createConsumer(groupId?: string) {
  let connection: amqp.ChannelModel | null = null;
  let channel: amqp.Channel | null = null;

  // Use groupId as the queue name to allow consumer groups.
  // If no groupId is provided, we create a temporary exclusive queue.
  const queueName = groupId || '';

  return {
    /** Connect and subscribe to one or more topics, then start processing. */
    async subscribe(topics: string[], handler: MessageHandler<unknown>): Promise<void> {
      let connectOptions: string | amqp.Options.Connect =
        process.env.RABBITMQ_URL || 'amqp://localhost:5672';

      if (process.env.RABBITMQ_HOST) {
        connectOptions = {
          protocol: 'amqp',
          hostname: process.env.RABBITMQ_HOST,
          port: process.env.RABBITMQ_PORT ? parseInt(process.env.RABBITMQ_PORT) : 5672,
          username: process.env.RABBITMQ_USER || 'scooterfy',
          password: process.env.RABBITMQ_PASSWORD,
        };
      }

      try {
        connection = await amqp.connect(connectOptions);
        channel = await connection.createChannel();

        await channel.assertExchange(EXCHANGE, 'topic', { durable: true });

        const q = await channel.assertQueue(queueName, {
          durable: !!groupId,
          exclusive: !groupId,
          autoDelete: !groupId, // If no group id, delete queue when consumer disconnects
        });

        // Bind the queue to all requested topics
        for (const topic of topics) {
          await channel.bindQueue(q.queue, EXCHANGE, topic);
        }

        // Prefetch to avoid overwhelming the consumer
        await channel.prefetch(10);

        await channel.consume(
          q.queue,
          async (msg) => {
            if (msg !== null) {
              try {
                const raw = msg.content.toString();
                const payload = JSON.parse(raw);
                await handler(payload, raw, msg.fields.routingKey);

                // Acknowledge the message after successful processing
                channel!.ack(msg);
              } catch (err) {
                console.error(
                  `[RabbitMQ Subscriber] Failed to process message from ${msg.fields.routingKey}`,
                  err,
                );
                // Nack the message and don't requeue (to prevent infinite loop of bad messages)
                channel!.nack(msg, false, false);
              }
            }
          },
          { noAck: false },
        );

        console.log(`[RabbitMQ Subscriber] Subscribed to ${topics.join(', ')} on queue ${q.queue}`);

        connection.on('error', (err) => {
          console.error('[RabbitMQ Subscriber] Connection error', err);
        });
        connection.on('close', () => {
          console.error('[RabbitMQ Subscriber] Connection closed');
        });
      } catch (error) {
        console.error('[RabbitMQ Subscriber] Failed to connect', error);
        throw error;
      }
    },
    async disconnect() {
      if (channel) {
        await channel.close();
      }
      if (connection) {
        await connection.close();
      }
    },
  };
}

export { TOPICS };
