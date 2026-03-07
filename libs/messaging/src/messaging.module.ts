import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RabbitMqService } from './rabbitmq.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [RabbitMqService],
  exports: [RabbitMqService],
})
export class MessagingModule {}
