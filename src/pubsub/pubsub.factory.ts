import { Injectable } from '@nestjs/common';
import { PubSubService } from './pubsub.service';
import { ENV } from '../env';

@Injectable()
export class PubSubFactory {
  isServiceEnabled(): boolean {
    return !!ENV.NSQ_URL;
  }

  getService(): PubSubService {
    return new PubSubService({ url: ENV.NSQ_URL });
  }
}
