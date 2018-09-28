import { MemoryStore } from './memory.store';

describe('MemoryStore', () => {
  it('should create entity', async () => {
    const store = new MemoryStore();

    const event = await store.createEntity({
      entity: 'User',
      data: { blah: 'foo' },
    });
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
    const store = new MemoryStore();

    const event = await store.createEntity({
      entity: 'User',
      data: { blah: 'foo' },
    });

    const event2 = await store.updateEntity({
      entity: 'User',
      entityId: event.entityId,
      data: { john: 'doe' },
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
    const store = new MemoryStore();

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

    const events = await store.getEvents({ entity: 'User' });
    expect(events.length).toBe(2);
  });
  it('should fetch created entity', async () => {
    const store = new MemoryStore();

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
      data: {
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
});
