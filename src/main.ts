import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ENV } from 'env';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(ENV.PORT || 80);
}
bootstrap();
