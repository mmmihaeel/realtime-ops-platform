import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { GlobalExceptionFilter, ResponseTransformInterceptor } from '@app/common';
import { RealtimeGatewayModule } from './realtime-gateway.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(RealtimeGatewayModule, {
    bufferLogs: true,
  });

  app.useLogger(new Logger());
  app.use(helmet());
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalInterceptors(new ResponseTransformInterceptor());
  app.useGlobalFilters(new GlobalExceptionFilter());

  const configService = app.get(ConfigService);
  const port = Number(configService.get<string>('REALTIME_PORT', { infer: true }) ?? '3002');
  await app.listen(port, '0.0.0.0');

  Logger.log(`Realtime gateway listening on port ${port}`);
}

void bootstrap();
