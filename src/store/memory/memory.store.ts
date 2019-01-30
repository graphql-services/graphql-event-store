import { Store } from '../base.store';
import { StoreEvent } from '../store-event.model';

export class MemoryStore extends Store {
  private events: StoreEvent[] = [];

  async getEvents(props: {
    entity?: string;
    entityId?: string;
    cursorFrom?: string;
    cursorTo?: string;
    limit?: number;
    sort?: string;
  }): Promise<StoreEvent[]> {
    let events = this.events;

    events = events.filter(
      e =>
        (!props.entity || e.entity === props.entity) &&
        (!props.entityId || e.entityId === props.entityId) &&
        (!props.cursorFrom || e.cursor > props.cursorFrom) &&
        (!props.cursorTo || e.cursor < props.cursorTo),
    );

    if (typeof props.limit !== 'undefined') {
      events = events.slice(0, props.limit);
    }

    return events;
  }

  async saveEvent(event: StoreEvent): Promise<void> {
    this.events.push(event);
  }
}
