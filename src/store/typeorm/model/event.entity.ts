import { Entity, Column, PrimaryGeneratedColumn, PrimaryColumn } from 'typeorm';
import {
  StoreEventData,
  StoreEventType,
  IChangeItem,
} from '../../store-event.model';
// import { StoreEventType, StoreEventData } from '../../base.store';

@Entity({ name: '_events' })
export class Event {
  @PrimaryColumn()
  id: string;

  @Column()
  entity: string;

  @Column()
  entityId: string;

  @Column({
    type: 'text',
    nullable: true,
  })
  rawData: string;

  get data(): IChangeItem[] {
    return JSON.parse(this.rawData) || [];
  }
  set data(value: IChangeItem[] | null) {
    this.rawData = JSON.stringify(value);
  }

  @Column()
  cursor: string;

  @Column({ nullable: true })
  operationName?: string;

  @Column()
  rawType: string;

  get type(): StoreEventType {
    return this.rawType as StoreEventType;
  }
  set type(type: StoreEventType) {
    this.rawType = type;
  }

  @Column()
  date: Date;

  @Column({ nullable: true })
  principalId?: string;
}
