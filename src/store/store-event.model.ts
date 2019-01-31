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
export interface StoreEvent extends StoreEventBase<IChangeItem[] | null> {}

export interface StoreAggregatedEventValue {
  name: string;
  value?: string;
}

export const objectToEventValue = (obj: {
  [key: string]: any;
}): StoreAggregatedEventValue[] => {
  const values: StoreAggregatedEventValue[] = [];
  for (const name of Object.keys(obj)) {
    values.push({
      name,
      value: JSON.parse(JSON.stringify(obj[name])),
    });
  }
  return values;
};

export interface StoreAggregatedEvent
  extends StoreEventBase<StoreEventData | null> {
  columns: string[];
  oldValues: StoreAggregatedEventValue[];
  newValues: StoreAggregatedEventValue[];
}

const onlyUnique = (value, index, self) => {
  return self.indexOf(value) === index;
};

export const getChangedColumns = (event: StoreEvent): string[] => {
  if (!event.data) {
    return [];
  }

  let columns: string[] = [];
  for (const item of event.data) {
    if (item.key.length === 0) {
      if (item.type === 'put' && typeof item.value === 'object')
        columns = [...Object.keys(item.value), ...columns];
    } else {
      columns.push(item.key[0]);
    }
  }

  return columns.filter(onlyUnique);
};
