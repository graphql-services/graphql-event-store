import { Injectable } from '@nestjs/common';

import { ENV } from '../env';
import { ForwarderService } from './forwarder.service';
import { log } from '../logger';

@Injectable()
export class ForwarderFactory {
  getService(): ForwarderService {
    const urls =
      (ENV.EVENT_FORWARD_URL &&
        ENV.EVENT_FORWARD_URL.length > 0 &&
        ENV.EVENT_FORWARD_URL.split(';')) ||
      [];
    log(`creating event forwarding service: ${urls}`);
    return new ForwarderService({ urls });
  }
}
