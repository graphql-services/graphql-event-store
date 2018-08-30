import * as diff from 'changeset';
import { v4 } from 'uuid';
import {
  StoreEvent,
  StoreEventData,
  StoreEventOutputData,
  StoreEventType,
} from './store-event.model';

export class Store {
  async initialize() {}

  async getEvents(props: {
    entity?: string;
    entityId?: string;
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
        data = diff.apply(event.data, data);
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
    let updatedAt: Date | null = null;
    let deletedAt: Date | null = null;
    for (const event of events) {
      if (event.type === StoreEventType.CREATED) {
        createdAt = event.date;
      }
      if (event.type === StoreEventType.UPDATED) {
        updatedAt = event.date;
      }
      if (event.type === StoreEventType.DELETED) {
        deletedAt = event.date;
      }
    }

    return {
      ...data,
      createdAt,
      updatedAt,
      deletedAt,
      id: props.entityId,
    };
  }

  async createEntity(props: {
    entity: string;
    data: StoreEventData;
    operationName?: string;
  }): Promise<StoreEvent> {
    const entityId = v4();
    const event: StoreEvent = {
      entityId,
      id: v4(),
      entity: props.entity,
      operationName: props.operationName,
      data: diff(null, props.data),
      type: StoreEventType.CREATED,
      date: new Date(),
    };

    await this.saveEvent(event);

    return event;
  }

  async updateEntity(props: {
    entity: string;
    entityId: string;
    data: StoreEventData;
    operationName?: string;
  }): Promise<StoreEvent | null> {
    const events = await this.getEvents(props);
    if (events.length === 0) {
      return null;
    }

    const currentData = await this.mergeEvents(events);

    const newData = Object.assign({}, currentData, props.data);
    const changes = diff(currentData, newData);

    if (changes.length > 0) {
      const event: StoreEvent = {
        id: v4(),
        entityId: props.entityId,
        entity: props.entity,
        operationName: props.operationName,
        data: changes,
        type: StoreEventType.UPDATED,
        date: new Date(),
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
  }): Promise<StoreEvent> {
    const event: StoreEvent = {
      id: v4(),
      entityId: props.entityId,
      entity: props.entity,
      operationName: props.operationName,
      data: null,
      type: StoreEventType.DELETED,
      date: new Date(),
    };

    this.saveEvent(event);

    return event;
  }
}
