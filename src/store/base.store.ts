import { diff, apply } from '../changeset';
import { v4 } from 'uuid';
import {
  StoreEvent,
  StoreEventData,
  StoreEventOutputData,
  StoreEventType,
} from './store-event.model';
import { log } from '../logger';

const createDiff = diff;
export class Store {
  async initialize() {}

  async getEvents(props: {
    entity?: string;
    entityId?: string;
    cursor?: string;
    limit?: number;
    sort?: string;
  }): Promise<StoreEvent[]> {
    throw new Error('not implemented');
  }

  async saveEvent(event: StoreEvent): Promise<void> {
    throw new Error('not implemented');
  }

  private mergeEvents(events: StoreEvent[]): StoreEventData | null {
    let data: StoreEventData | null = null;

    for (const event of events) {
      if (event.data) {
        data = apply(event.data, data || {});
      }
    }

    return data;
  }

  async getEntityData(props: {
    entity: string;
    entityId: string;
  }): Promise<StoreEventOutputData | null> {
    const events = await this.getEvents(props);
    const data = await this.mergeEvents(events);

    if (events.length === 0) {
      return null;
    }

    let createdAt: Date = new Date();
    let createdBy: string | null = null;
    let updatedAt: Date | null = null;
    let updatedBy: string | null = null;
    let deletedAt: Date | null = null;
    let deletedBy: string | null = null;
    for (const event of events) {
      if (event.type === StoreEventType.CREATED) {
        createdAt = event.date;
        createdBy = event.principalId || null;
      }
      if (event.type === StoreEventType.UPDATED) {
        updatedAt = event.date;
        updatedBy = event.principalId || null;
      }
      if (event.type === StoreEventType.DELETED) {
        deletedAt = event.date;
        deletedBy = event.principalId || null;
      }
    }

    return {
      ...data,
      createdAt,
      createdBy,
      updatedAt,
      updatedBy,
      deletedAt,
      deletedBy,
      id: props.entityId,
    };
  }

  async createEntity(props: {
    entity: string;
    data: StoreEventData;
    operationName?: string;
    principalId?: string;
  }): Promise<StoreEvent> {
    const entityId = v4();
    const entityDate = new Date();

    const sanitizedData = JSON.parse(JSON.stringify(props.data));

    const event: StoreEvent = {
      entityId,
      id: v4(),
      entity: props.entity,
      operationName: props.operationName,
      data: createDiff(null, sanitizedData),
      type: StoreEventType.CREATED,
      cursor: entityDate.toISOString() + '.' + process.hrtime()[1],
      date: entityDate,
      principalId: props.principalId,
    };

    await this.saveEvent(event);

    return event;
  }

  async updateEntity(props: {
    entity: string;
    entityId: string;
    data: StoreEventData;
    operationName?: string;
    principalId?: string;
  }): Promise<StoreEvent | null> {
    const events = await this.getEvents(props);
    if (events.length === 0) {
      return null;
    }

    const currentData = await this.mergeEvents(events);

    const sanitizedData = JSON.parse(JSON.stringify(props.data));
    const newData = Object.assign({}, currentData, sanitizedData);
    const changes = createDiff(currentData, newData);
    log(
      'changes for event',
      JSON.stringify(currentData),
      '=>',
      JSON.stringify(newData),
      ' == ',
      JSON.stringify(changes),
    );

    if (changes.length > 0) {
      const entityDate = new Date();
      const event: StoreEvent = {
        id: v4(),
        entityId: props.entityId,
        entity: props.entity,
        operationName: props.operationName,
        data: changes,
        type: StoreEventType.UPDATED,
        cursor: entityDate.toISOString() + '.' + process.hrtime()[1],
        date: entityDate,
        principalId: props.principalId,
      };
      await this.saveEvent(event);
      return event;
    }
    return null;
  }

  async deleteEntity(props: {
    entity: string;
    entityId: string;
    operationName?: string;
    principalId?: string;
  }): Promise<StoreEvent> {
    const entityDate = new Date();
    const event: StoreEvent = {
      id: v4(),
      entityId: props.entityId,
      entity: props.entity,
      operationName: props.operationName,
      data: null,
      type: StoreEventType.DELETED,
      cursor: entityDate.toISOString() + '.' + process.hrtime()[1],
      date: entityDate,
      principalId: props.principalId,
    };

    await this.saveEvent(event);

    return event;
  }
}
