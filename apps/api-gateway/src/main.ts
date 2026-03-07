import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { GlobalExceptionFilter, ResponseTransformInterceptor } from '@app/common';
import { ApiGatewayModule } from './api-gateway.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(ApiGatewayModule, {
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
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(new ResponseTransformInterceptor());

  const config = new DocumentBuilder()
    .setTitle('Realtime Ops Platform API')
    .setDescription('Operational workflow and incident management APIs')
    .setVersion('1.0.0')
    .addServer('/api/v1')
    .addApiKey(
      {
        type: 'apiKey',
        name: 'x-operator-token',
        in: 'header',
      },
      'operator-token',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const configService = app.get(ConfigService);
  const port = Number(configService.get<string>('API_PORT', { infer: true }) ?? '3001');

  await app.listen(port, '0.0.0.0');
  Logger.log(`API gateway listening on port ${port}`);
}

void bootstrap();
