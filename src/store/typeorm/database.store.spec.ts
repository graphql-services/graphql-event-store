import { DatabaseStore } from './database.store';

describe('DatabaseStore', () => {
  let store: DatabaseStore;

  beforeEach(async () => {
    store = new DatabaseStore({
      type: 'sqlite',
      database: ':memory:',
    });
  });

  afterEach(async () => {
    return store.close();
  });

  it('should create entity', async () => {
    const event = await store.createEntity({
      entity: 'User',
      data: { blah: 'foo' },
    });

    expect(event.cursor).not.toBeNull();

    const result = await store.getEntityData({
      entity: 'User',
      entityId: event.entityId,
    });

    expect(result.id).not.toBe(null);
    expect(result.deletedAt).toBe(null);
    expect(result.updatedAt).toBe(null);

    const events = await store.getEvents({ entity: 'User' });
    expect(events.length).toBe(1);
  });

  it('should update entity', async () => {
    const event = await store.createEntity({
      entity: 'User',
      data: { blah: 'foo' },
    });

    const event2 = await store.updateEntity({
      entity: 'User',
      entityId: event.entityId,
      oldData: { blah: 'foo' },
      newData: { john: 'doe' },
    });

    const result = await store.getEntityData({
      entity: 'User',
      entityId: event.entityId,
    });
    const result2 = await store.getEntityData({
      entity: 'User',
      entityId: event2.entityId,
    });

    expect(result.entityId).toBe(result2.entityId);
    expect(result2.updatedAt).not.toBe(null);
    expect(result2.deletedAt).toBe(null);
    expect(result2.blah).toBe('foo');
    expect(result2.john).toBe('doe');

    const events = await store.getEvents({ entity: 'User' });
    expect(events.length).toBe(2);
  });

  it('should delete entity', async () => {
    const event = await store.createEntity({
      entity: 'User',
      data: { blah: 'foo' },
    });

    const event2 = await store.deleteEntity({
      entity: 'User',
      entityId: event.entityId,
    });

    const result = await store.getEntityData({
      entity: 'User',
      entityId: event.entityId,
    });
    const result2 = await store.getEntityData({
      entity: 'User',
      entityId: event2.entityId,
    });

    expect(result.id).toBe(result2.id);
    expect(result2.updatedAt).toBe(null);
    expect(result2.deletedAt).not.toBe(null);
    expect(result2.blah).toBe('foo');

    const events = await store.getEvents({ entity: 'User', sort: 'date:DESC' });
    expect(events.length).toBe(2);
    expect(events[1].date.getTime()).toBeLessThanOrEqual(
      events[0].date.getTime(),
    );
  });

  it('should fetch created entity', async () => {
    const result = await store.createEntity({
      entity: 'User',
      data: {
        blah: 'foo',
        items: [{ id: 123, amount: 1 }, { id: 124, amount: 2 }],
      },
    });

    await store.updateEntity({
      entity: 'User',
      entityId: result.entityId,
      oldData: {
        blah: 'foo',
        items: [{ id: 123, amount: 1 }, { id: 124, amount: 2 }],
      },
      newData: {
        items: [
          { id: 124, amount: 2 },
          { id: 321, amount: 1 },
          { id: 123, amount: 3 },
        ],
      },
    });

    const result2 = await store.getEntityData({
      entity: 'User',
      entityId: result.entityId,
    });

    expect(result.entityId).toBe(result2.id);
    expect(result2.updatedAt).not.toBe(null);
    expect(result2.deletedAt).toBe(null);
    expect(result2.blah).toBe('foo');
    expect(result2.items).toEqual([
      { id: 124, amount: 2 },
      { id: 321, amount: 1 },
      { id: 123, amount: 3 },
    ]);

    const events = await store.getEvents({ entity: 'User' });
    expect(events.length).toBe(2);
  });

  it('should fetch events', async () => {
    const event = await store.createEntity({
      entity: 'User',
      data: { blah: 'foo' },
    });
    const event2 = await store.updateEntity({
      entity: 'User',
      entityId: event.entityId,
      oldData: { blah: 'foo' },
      newData: { blah: 'foo2' },
    });

    expect(event.cursor).not.toBeNull();
    expect(event2.cursor).not.toBeNull();

    const events = await store.getEvents({});
    expect(events.length).toBe(2);

    const events2 = await store.getEvents({ limit: 1 });
    expect(events2.length).toBe(1);

    const events3 = await store.getEvents({ cursor: event.cursor });
    expect(events3.length).toBe(1);
  });
});
