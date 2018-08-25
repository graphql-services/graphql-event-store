import { Store, StoreEvent } from '../base.store';
import {
  createConnection,
  Repository,
  FindConditions,
  ConnectionOptions,
} from 'typeorm';
import { Event } from './model/event.entity';
import { ENV } from 'env';

export class DatabaseStore extends Store {
  private repository?: Repository<Event>;

  constructor(private readonly options: ConnectionOptions) {
    super();
    this.options = Object.assign({}, options, {
      entities: [__dirname + '/model/*.ts'],
    });
  }

  async getRepository(): Promise<Repository<Event>> {
    if (!this.repository) {
      const connection = await createConnection(this.options);

      if (ENV.NODE_ENV !== 'production') {
        global.console.log('Synchronizing database (NODE_ENV: !production)');
        await connection.synchronize();
      }

      this.repository = connection.getRepository(Event);
    }
    return this.repository;
  }

  async getEvents(props: {
    entity?: string;
    entityId?: string;
  }): Promise<StoreEvent[]> {
    const repo = await this.getRepository();

    const where: FindConditions<Event> = {};
    if (props.entity) where.entity = props.entity;
    if (props.entityId) where.entityId = props.entityId;

    const events = await repo.find({
      where,
    });
    return events;
  }

  async saveEvent(event: StoreEvent): Promise<void> {
    const repo = await this.getRepository();

    const _event = new Event();
    _event.id = event.id;
    _event.entity = event.entity;
    _event.entityId = event.entityId;
    _event.data = event.data;
    _event.type = event.type;
    _event.date = event.date;

    await repo.save(_event);
  }
}
