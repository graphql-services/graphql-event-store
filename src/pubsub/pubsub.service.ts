import * as nsq from 'nsq.js';
import { StoreEvent } from 'store/store-event.model';

interface PubSubMessage {
  event: StoreEvent;
}

export class PubSubService {
  private writer?: any;

  constructor(private readonly config: { url: string }) {}

  async ensureWriter() {
    if (!this.writer) {
      this.writer = nsq.writer(this.config.url);
      this.writer.on('error', err => {
        global.console.log('error', err);
      });
      this.writer.on('error response', err => {
        global.console.log('error response', err);
      });
      return new Promise((resolve, reject) => {
        this.writer.on('ready', () => {
          resolve();
        });
      });
    }
  }

  async publish(message: PubSubMessage) {
    await this.ensureWriter();
    return new Promise(resolve => {
      this.writer.publish('es-event', JSON.stringify(message.event), () => {
        resolve();
      });
    });
  }
}
