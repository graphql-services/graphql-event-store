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

export interface StoreEvent {
  id: string;
  entity: string;
  entityId: string;
  operationName?: string;
  data: StoreEventData | null;
  type: StoreEventType;
  date: Date;
  cursor: string;
  principalId?: string;
}

interface IChangeItem {
  type: 'put' | 'del';
  key: string[];
  value: any;
}
export const getChangedColumns = (event: StoreEvent): string[] => {
  const items = event.data as IChangeItem[];

  let columns: string[] = [];
  for (const item of items) {
    if (item.key.length === 0) {
      if (item.type === 'put' && typeof item.value === 'object')
        columns = [...Object.keys(item.value), ...columns];
    } else {
      columns.push(item.key[0]);
    }
  }

  return columns;
};
