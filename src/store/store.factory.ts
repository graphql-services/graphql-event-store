import { Injectable } from '@nestjs/common';
import { Store } from 'store/base.store';
import { MemoryStore } from 'store/memory/memory.store';
import { DatabaseStore } from './typeorm/database.store';
import { parse } from 'url';
import { ENV } from 'env';

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

    if (dbUrl.protocol === 'sqlite:') {
      return new DatabaseStore({
        type: 'sqlite',
        database: dbUrl.host,
      });
    } else {
      const type = (dbUrl.protocol || '').replace(':', '') as any;
      const allowedTypes = ['mysql', 'mssql', 'mariadb', 'postgres'];
      if (type in allowedTypes) {
        return new DatabaseStore({
          type,
          url: db_url,
        });
      } else {
        throw new Error(
          `${type} is not one of allowed types (${allowedTypes})`,
        );
      }
    }
  }
}
