import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as amqp from 'amqplib';
import type { Channel, ChannelModel, ConsumeMessage } from 'amqplib';
import { EXCHANGES, QUEUES } from './messaging.constants';

@Injectable()
export class RabbitMqService implements OnModuleInit, OnModuleDestroy {
  private connection: ChannelModel | null = null;
  private channel: Channel | null = null;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit(): Promise<void> {
    const url = this.configService.get<string>('RABBITMQ_URL', { infer: true });
    if (!url) {
      throw new Error('RABBITMQ_URL is required');
    }

    this.connection = await amqp.connect(url);
    this.channel = await this.connection.createChannel();
    await this.channel.assertExchange(EXCHANGES.EVENTS, 'topic', { durable: true });
    await this.channel.assertQueue(QUEUES.JOB_PROCESSING, { durable: true });
  }

  async onModuleDestroy(): Promise<void> {
    if (this.channel) {
      await this.channel.close();
    }

    if (this.connection) {
      await this.connection.close();
    }
  }

  async publishToQueue<T extends Record<string, unknown>>(
    queue: string,
    payload: T,
  ): Promise<void> {
    const channel = this.ensureChannel();
    channel.sendToQueue(queue, Buffer.from(JSON.stringify(payload)), { persistent: true });
  }

  async publishEvent<T extends Record<string, unknown>>(
    routingKey: string,
    payload: T,
  ): Promise<void> {
    const channel = this.ensureChannel();
    const envelope = {
      topic: routingKey,
      emittedAt: new Date().toISOString(),
      payload,
    };

    channel.publish(EXCHANGES.EVENTS, routingKey, Buffer.from(JSON.stringify(envelope)), {
      persistent: true,
    });
  }

  async consume(
    queue: string,
    handler: (payload: Record<string, unknown>, message: ConsumeMessage) => Promise<void>,
  ): Promise<void> {
    const channel = this.ensureChannel();
    await channel.assertQueue(queue, { durable: true });
    await channel.prefetch(10);

    await channel.consume(queue, async (message) => {
      if (!message) {
        return;
      }

      try {
        const payload = JSON.parse(message.content.toString()) as Record<string, unknown>;
        await handler(payload, message);
        channel.ack(message);
      } catch {
        channel.nack(message, false, false);
      }
    });
  }

  async createEventConsumer(
    queueName: string,
    routingPattern: string,
    handler: (event: {
      topic: string;
      emittedAt?: string;
      payload: Record<string, unknown>;
    }) => Promise<void>,
  ): Promise<void> {
    const channel = this.ensureChannel();
    await channel.assertQueue(queueName, { durable: true, autoDelete: false });
    await channel.bindQueue(queueName, EXCHANGES.EVENTS, routingPattern);

    await channel.consume(queueName, async (message) => {
      if (!message) {
        return;
      }

      try {
        const parsed = JSON.parse(message.content.toString()) as {
          topic?: string;
          emittedAt?: string;
          payload?: Record<string, unknown>;
        };

        await handler({
          topic: parsed.topic ?? message.fields.routingKey,
          emittedAt: parsed.emittedAt,
          payload: parsed.payload ?? {},
        });

        channel.ack(message);
      } catch {
        channel.nack(message, false, false);
      }
    });
  }

  private ensureChannel(): Channel {
    if (!this.channel) {
      throw new Error('RabbitMQ channel is not initialized');
    }

    return this.channel;
  }
}
