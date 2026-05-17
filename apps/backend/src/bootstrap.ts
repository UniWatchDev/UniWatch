import type { INestApplication } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { cleanupOpenApiDoc } from 'nestjs-zod';
import type { Env } from '@/utils/env.validation';

export function configureApp(
  app: INestApplication,
  configService: ConfigService<Env, true>
): void {
  const isProduction =
    configService.get('NODE_ENV', { infer: true }) === 'production';

  // Default helmet includes a strict CSP. We can keep it on because Swagger UI
  // (which ships inline scripts/styles) is never mounted in production.
  app.use(helmet());
  app.use(cookieParser());

  app.setGlobalPrefix('api');
  app.enableCors({
    origin: resolveCorsOrigin(configService.get('CORS_ORIGIN', { infer: true })),
    credentials: true
  });

  if (!isProduction) {
    mountSwagger(app);
  }
}

function mountSwagger(app: INestApplication): void {
  const swaggerConfig = new DocumentBuilder()
    .setTitle('agentbase API')
    .setDescription('NestJS starter API for the agentbase monorepo')
    .setVersion('0.0.1')
    .build();

  const openApiDoc = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, cleanupOpenApiDoc(openApiDoc));
}

function resolveCorsOrigin(raw: string): true | string[] {
  if (raw === '*') return true;
  const origins = raw
    .split(',')
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
  return origins.length > 0 ? origins : true;
}
