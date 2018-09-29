import { Store } from '../base.store';
import { StoreEvent } from '../store-event.model';

export class MemoryStore extends Store {
  private events: StoreEvent[] = [];

  async getEvents(props: {
    entity?: string;
    entityId?: string;
  }): Promise<StoreEvent[]> {
    return this.events.filter(
      e =>
        (!props.entity || e.entity === props.entity) &&
        (!props.entityId || e.entityId === props.entityId),
    );
  }

  async saveEvent(event: StoreEvent): Promise<void> {
    this.events.push(event);
  }
}
