import { Store } from '../base.store';
import {
  createConnection,
  Repository,
  FindConditions,
  ConnectionOptions,
  MoreThan,
  Connection,
} from 'typeorm';
import { Event } from './model/event.entity';
import { ENV } from '../../env';
import { StoreEvent } from '../store-event.model';
import { DriverUtils } from '../driver.utils';

export class DatabaseStore extends Store {
  private repository?: Repository<Event>;
  private connection?: Connection;

  constructor(private readonly options: ConnectionOptions) {
    super();
    this.options = Object.assign({}, options, {
      entities: [__dirname + '/model/*.ts'],
    });
  }

  async initialize() {
    await this.getRepository();
  }

  async close() {
    return this.connection && this.connection.close();
  }

  async getRepository(): Promise<Repository<Event>> {
    if (!this.repository) {
      this.connection = await createConnection(
        DriverUtils.buildDriverOptions(this.options),
      );

      if (ENV.NODE_ENV !== 'production') {
        global.console.log('Synchronizing database (NODE_ENV: !production)');
        await this.connection.synchronize();
      }

      this.repository = this.connection.getRepository(Event);
    }
    return this.repository;
  }

  async getEvents(props: {
    entity?: string;
    entityId?: string;
    cursor?: string;
    limit?: number;
  }): Promise<StoreEvent[]> {
    const repo = await this.getRepository();

    const where: FindConditions<Event> = {};
    if (props.entity) where.entity = props.entity;
    if (props.entityId) where.entityId = props.entityId;
    if (props.cursor) where.cursor = MoreThan(props.cursor);

    const events = await repo.find({
      where,
      order: { cursor: 'ASC' },
      take: props.limit,
    });

    return events;
  }

  async saveEvent(event: StoreEvent): Promise<void> {
    const repo = await this.getRepository();

    const _event = new Event();
    _event.id = event.id;
    _event.entity = event.entity;
    _event.entityId = event.entityId;
    _event.operationName = event.operationName;
    _event.data = event.data;
    _event.type = event.type;
    _event.cursor = event.cursor;
    _event.date = event.date;

    await repo.save(_event);
  }
}
