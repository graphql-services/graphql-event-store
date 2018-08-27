import { Injectable } from '@nestjs/common';
import { GraphQLFieldResolver } from 'graphql';
import { Store, StoreFactory } from '../store/store.factory';
import { PubSubFactory } from 'pubsub/pubsub.factory';
import { PubSubService } from 'pubsub/pubsub.service';

@Injectable()
export class ResolverService {
  private store: Store;
  private pubsub?: PubSubService;
  constructor(
    private readonly connectionFactory: StoreFactory,
    private readonly pubsubFactory: PubSubFactory,
  ) {
    this.store = connectionFactory.getConnection();
    if (pubsubFactory.isServiceEnabled()) {
      this.pubsub = pubsubFactory.getService();
    }
  }

  eventsResolver(): GraphQLFieldResolver<any, any, any> {
    return (parent: any, args: { entity: string; id: string }) => {
      return this.store.getEvents({
        entity: args.entity,
        entityId: args.id,
      });
    };
  }

  readResolver(resource: string): GraphQLFieldResolver<any, any, any> {
    return async (parent: any, args: { id: string }) => {
      return await this.store.getEntityData({
        entity: resource,
        entityId: args.id,
      });
    };
  }
  createResolver(resource: string): GraphQLFieldResolver<any, any, any> {
    return async (parent: any, args: { input: any }) => {
      const event = await this.store.createEntity({
        entity: resource,
        data: args.input,
      });

      if (this.pubsub) {
        await this.pubsub.publish({
          event,
        });
      }

      return this.store.getEntityData({
        entity: resource,
        entityId: event.entityId,
      });
    };
  }
  updateResolver(resource: string): GraphQLFieldResolver<any, any, any> {
    return async (parent: any, args: { input: any; id: string }) => {
      const event = await this.store.updateEntity({
        entity: resource,
        entityId: args.id,
        data: args.input,
      });

      if (event && this.pubsub) {
        await this.pubsub.publish({
          event,
        });
      }

      return this.store.getEntityData({
        entity: resource,
        entityId: args.id,
      });
    };
  }
  deleteResolver(resource: string): GraphQLFieldResolver<any, any, any> {
    return async (parent: any, args: { id: string }) => {
      const event = await this.store.deleteEntity({
        entity: resource,
        entityId: args.id,
      });

      if (this.pubsub) {
        await this.pubsub.publish({
          event,
        });
      }

      return this.store.getEntityData({
        entity: resource,
        entityId: args.id,
      });
    };
  }
}
