import { log } from 'logger';

export enum StoreEventType {
  CREATED = 'CREATED',
  UPDATED = 'UPDATED',
  DELETED = 'DELETED',
}

export interface StoreEventData {
  [key: string]: any;
}
export interface StoreEventOutputData extends StoreEventData {
  id: string;
  createdAt: Date;
  updatedAt?: Date;
  deletedAt?: Date;
}

export interface StoreEventBase<T> {
  id: string;
  entity: string;
  entityId: string;
  operationName?: string;
  data: T;
  type: StoreEventType;
  date: Date;
  cursor: string;
  principalId?: string;
}
export interface IChangeItem {
  type: 'put' | 'del';
  key: string[];
  value: any;
}
export interface StoreEvent extends StoreEventBase<IChangeItem[]> {}
export interface StoreAggregatedEvent
  extends StoreEventBase<StoreEventData | null> {}

export const getChangedColumns = (event: StoreEvent): string[] => {
  let columns: string[] = [];
  for (const item of event.data) {
    if (item.key.length === 0) {
      if (item.type === 'put' && typeof item.value === 'object')
        columns = [...Object.keys(item.value), ...columns];
    } else {
      columns.push(item.key[0]);
    }
  }

  return columns;
};
