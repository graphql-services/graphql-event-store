import { Injectable } from '@nestjs/common';
import { Store } from 'store/base.store';
import { MemoryStore } from 'store/memory/memory.store';
import { DatabaseStore } from './typeorm/database.store';
import { parse } from 'url';
import { ENV } from 'env';
import { DriverUtils } from './driver.utils';

export { Store } from 'store/base.store';

@Injectable()
export class StoreFactory {
  getConnection(): Store {
    const db_url = ENV.DATABASE_URL || 'memory';
    const dbUrl = parse(db_url);

    if (dbUrl.path === 'memory') {
      global.console.log('Running store in memory!');
      return new MemoryStore();
    }

    return new DatabaseStore(DriverUtils.getConnectionOptions());
  }
}
