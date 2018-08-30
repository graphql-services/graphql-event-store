import { Entity, Column, PrimaryGeneratedColumn, PrimaryColumn } from 'typeorm';
import { StoreEventData, StoreEventType } from '../../store-event.model';
// import { StoreEventType, StoreEventData } from '../../base.store';

@Entity()
export class Event {
  @PrimaryColumn()
  id: string;

  @Column()
  entity: string;

  @Column()
  entityId: string;

  @Column({
    // transformer: {
    //   from(value: StoreEventData | null): string | null {
    //     global.console.log('from', value);
    //     if (value === null) return null;
    //     return JSON.stringify(value);
    //   },
    //   to(value: string | null): StoreEventData | null {
    //     global.console.log('to', value);
    //     if (value === null) return null;
    //     return JSON.parse(value);
    //   },
    // },
    type: 'text',
    nullable: true,
  })
  rawData: string;

  get data(): StoreEventData | null {
    return JSON.parse(this.rawData);
  }
  set data(value: StoreEventData | null) {
    this.rawData = JSON.stringify(value);
  }

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
}
