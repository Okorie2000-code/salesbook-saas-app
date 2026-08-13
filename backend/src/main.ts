import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

async function bootstrap() {
  // rawBody: true lets payment providers' webhooks verify request signatures
  const app = await NestFactory.create(AppModule, { rawBody: true });

  // Secure HTTP headers (CSP, X-Frame-Options, HSTS…)
  app.use(helmet());

  // In production, CORS_ORIGINS must be set explicitly (comma-separated list of
  // your frontend origins). We never fall back to "allow all origins" in prod.
  const corsOrigins = process.env.CORS_ORIGINS?.split(',').map((o) => o.trim()).filter(Boolean);
  if (corsOrigins && corsOrigins.length > 0) {
    app.enableCors({ origin: corsOrigins, credentials: true });
  } else if (process.env.NODE_ENV === 'production') {
    throw new Error('CORS_ORIGINS must be set in production (comma-separated frontend origins)');
  } else {
    // Local development: allow all origins so the frontends can call the API
    app.enableCors({ origin: true, credentials: true });
  }

  // Behind a reverse proxy (Render, Railway, Fly.io…), trust the first hop so
  // rate limiting and audit logs see the real client IP instead of the proxy's.
  if (process.env.NODE_ENV === 'production') {
    app.getHttpAdapter().getInstance().set('trust proxy', 1);
  }

  // Validate every incoming DTO, strip unknown properties, auto-transform types
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Consistent response shape: { success, data } / { success, message, … }
  app.useGlobalInterceptors(new TransformInterceptor());
  app.useGlobalFilters(new AllExceptionsFilter());

  // All routes live under /api
  app.setGlobalPrefix('api');

  // Swagger / OpenAPI documentation at /api/docs
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Sales Book SaaS API')
    .setDescription('Backend REST API for the Sales Book SaaS platform')
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  const port = Number(process.env.PORT ?? 3002);
  await app.listen(port);
  console.log(`🚀 Sales Book API running on http://localhost:${port}/api`);
  console.log(`📚 Swagger docs on http://localhost:${port}/api/docs`);
}

bootstrap();
