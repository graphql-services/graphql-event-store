import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ENV } from './env';
import * as Sentry from '@sentry/node';

if (ENV.SENTRY_DNS) {
  Sentry.init({ dsn: ENV.SENTRY_DNS });
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(ENV.PORT || 80);
}
bootstrap();
