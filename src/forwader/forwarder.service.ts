import fetch, { RequestInit } from 'node-fetch';

import { StoreAggregatedEvent } from '../store/store-event.model';
import { log } from '../logger';

export interface ForwarderMessage {
  event: StoreAggregatedEvent;
}

export class ForwarderService {
  constructor(private readonly config: { urls: string[] }) {}

  async send(message: ForwarderMessage) {
    const init: RequestInit = {
      method: 'POST',
      body: JSON.stringify(message.event),
      headers: { 'content-type': 'application/json' },
    };
    const promises = this.config.urls.map(url =>
      this.sendEventToUrl(init, url),
    );
    await Promise.all(promises);
  }

  private async sendEventToUrl(init: RequestInit, url: string) {
    const res = await fetch(url, init);
    log(`message forwarded ${res.status} (${url})`);
    if (res.status >= 300 || res.status < 200) {
      const body = await res.text();
      throw new Error(
        `unexpected status code from forwarder (url: ${url}, status: ${
          res.status
        }, body: ${body})`,
      );
    }
  }
}
