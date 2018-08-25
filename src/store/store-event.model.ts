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
  data: StoreEventData | null;
  type: StoreEventType;
  date: Date;
}
