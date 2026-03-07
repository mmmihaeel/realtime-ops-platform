import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ProcessingServiceModule } from './processing-service.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.createApplicationContext(ProcessingServiceModule, {
    bufferLogs: true,
  });

  app.useLogger(new Logger());
  Logger.log('Processing service started');
}

void bootstrap();
