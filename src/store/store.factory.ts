import { parse } from 'url';
import { Injectable } from '@nestjs/common';

import { Store } from '../store/base.store';
import { MemoryStore } from '../store/memory/memory.store';
import { DatabaseStore } from './typeorm/database.store';
import { ENV } from '../env';
import { DriverUtils } from './driver.utils';
export { Store } from '../store/base.store';

@Injectable()
export class StoreFactory {
  private _store?: Store;
  getConnection(): Store {
    if (this._store) {
      return this._store;
    }
    const db_url = ENV.DATABASE_URL || 'memory';
    const dbUrl = parse(db_url);

    if (dbUrl.path === 'memory') {
      global.console.log('Running store in memory!');
      this._store = new MemoryStore();
    } else {
      this._store = new DatabaseStore(DriverUtils.getConnectionOptions());
    }
    return this._store;
  }
}

export const StoreFactoryProvider = {
  provide: StoreFactory,
  useFactory: async () => {
    const factory = new StoreFactory();
    await factory.getConnection().initialize();
    return factory;
  },
};
