import { Injectable } from '@nestjs/common';
import { GraphQLFieldResolver, GraphQLResolveInfo } from 'graphql';
import { Store, StoreFactory } from '../store/store.factory';
import { PubSubFactory } from '../pubsub/pubsub.factory';
import { PubSubService } from '../pubsub/pubsub.service';

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
    return (
      parent: any,
      args: { entity: string; id: string; cursor: string; limit: number },
    ) => {
      return this.store.getEvents({
        entity: args.entity,
        entityId: args.id,
        cursor: args.cursor,
        limit: args.limit,
      });
    };
  }

  readResolver(resource: string): GraphQLFieldResolver<any, any, any> {
    return async (
      parent: any,
      args: { id: string },
      ctx: any,
      info: GraphQLResolveInfo,
    ) => {
      return await this.store.getEntityData({
        entity: resource,
        entityId: args.id,
      });
    };
  }
  createResolver(resource: string): GraphQLFieldResolver<any, any, any> {
    return async (
      parent: any,
      args: { input: any },
      ctx: any,
      info: GraphQLResolveInfo,
    ) => {
      const event = await this.store.createEntity({
        entity: resource,
        data: args.input,
        operationName: info.operation.name && info.operation.name.value,
      });

      const data = await this.store.getEntityData({
        entity: resource,
        entityId: event.entityId,
      });

      if (this.pubsub) {
        await this.pubsub.publish({
          event: { ...event, data },
        });
      }

      return data;
    };
  }
  updateResolver(resource: string): GraphQLFieldResolver<any, any, any> {
    return async (
      parent: any,
      args: { input: any; id: string },
      ctx: any,
      info: GraphQLResolveInfo,
    ) => {
      const data = await this.store.getEntityData({
        entity: resource,
        entityId: args.id,
      });

      if (data && data.deletedAt) {
        throw new Error(`Cannot update deleted entity`);
      }

      const event = await this.store.updateEntity({
        entity: resource,
        entityId: args.id,
        data: args.input,
        operationName: info.operation.name && info.operation.name.value,
      });

      if (event && this.pubsub) {
        await this.pubsub.publish({
          event: { ...event, data },
        });
      }

      // this is double fetching of data - could be handled by applying diff
      return this.store.getEntityData({
        entity: resource,
        entityId: args.id,
      });
    };
  }
  deleteResolver(resource: string): GraphQLFieldResolver<any, any, any> {
    return async (
      parent: any,
      args: { id: string },
      ctx: any,
      info: GraphQLResolveInfo,
    ) => {
      const data = await this.store.getEntityData({
        entity: resource,
        entityId: args.id,
      });

      if (data && data.deletedAt) {
        throw new Error(`Cannot delete already deleted entity`);
      }

      const event = await this.store.deleteEntity({
        entity: resource,
        entityId: args.id,
        operationName: info.operation.name && info.operation.name.value,
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
}
