import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RabbitMqService } from '@app/messaging/rabbitmq.service';
import { RealtimeEventsGateway } from './realtime-events.gateway';

@Injectable()
export class RealtimeEventConsumer implements OnModuleInit {
  private readonly logger = new Logger(RealtimeEventConsumer.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly rabbitMqService: RabbitMqService,
    private readonly realtimeGateway: RealtimeEventsGateway,
  ) {}

  async onModuleInit(): Promise<void> {
    const queueName =
      this.configService.get<string>('REALTIME_EVENTS_QUEUE', { infer: true }) ??
      'realtime.gateway.events';

    await this.rabbitMqService.createEventConsumer(queueName, '#', async (event) => {
      this.realtimeGateway.broadcast(event.topic, event.payload, event.emittedAt);
    });

    this.logger.log(`Realtime consumer listening on queue ${queueName}`);
  }
}
