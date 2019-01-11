import { Injectable } from '@nestjs/common';
import { decode } from 'jsonwebtoken';
import { GraphQLFieldResolver, GraphQLResolveInfo } from 'graphql';

import { Store, StoreFactory } from '../store/store.factory';
import { PubSubFactory } from '../pubsub/pubsub.factory';
import { PubSubService } from '../pubsub/pubsub.service';
import { ForwarderService } from '../forwader/forwarder.service';
import { ForwarderFactory } from '../forwader/forwarder.factory';
import {
  StoreAggregatedEvent,
  getChangedColumns,
} from '../store/store-event.model';

@Injectable()
export class ResolverService {
  private store: Store;
  private pubsub?: PubSubService;
  private forwarder?: ForwarderService;
  constructor(
    private readonly connectionFactory: StoreFactory,
    private readonly pubsubFactory: PubSubFactory,
    private readonly forwarderFactory: ForwarderFactory,
  ) {
    this.store = connectionFactory.getConnection();
    if (pubsubFactory.isServiceEnabled()) {
      this.pubsub = pubsubFactory.getService();
    }
    this.forwarder = forwarderFactory.getService();
  }

  eventsResolver(): GraphQLFieldResolver<any, any, any> {
    return (
      parent: any,
      args: {
        entity: string;
        id: string;
        cursor: string;
        limit: number;
        sort: string;
      },
    ) => {
      return this.store.getEvents({
        entity: args.entity,
        entityId: args.id,
        cursor: args.cursor,
        limit: args.limit || 30,
        sort: args.sort,
      });
    };
  }

  principalIDFromRequest(req: any): string | null {
    let authorization = req.headers && req.headers.authorization;
    if (authorization) {
      authorization = authorization.replace('Bearer ', '');
      const payload = decode(authorization);
      if (typeof payload === 'string') {
        return null;
      }
      return (payload && payload.sub) || null;
    }
    return null;
  }

  // readResolver(resource: string): GraphQLFieldResolver<any, any, any> {
  //   return async (
  //     parent: any,
  //     args: { id: string },
  //     ctx: any,
  //     info: GraphQLResolveInfo,
  //   ) => {
  //     return await this.store.getEntityData({
  //       entity: resource,
  //       entityId: args.id,
  //     });
  //   };
  // }
  createResolver(resource: string): GraphQLFieldResolver<any, any, any> {
    return async (
      parent: any,
      args: { input: any },
      ctx: any,
      info: GraphQLResolveInfo,
    ) => {
      const principalId = this.principalIDFromRequest(ctx);
      const event = await this.store.createEntity({
        entity: resource,
        data: args.input,
        operationName: info.operation.name && info.operation.name.value,
        principalId,
      });

      await this.sendEvent({
        ...event,
        // data,
        columns: getChangedColumns(event),
      });

      // this is double fetching of data - could be handled by applying diff
      return this.store.getEntityData({
        entity: resource,
        entityId: event.entityId,
      });
    };
  }
  updateResolver(resource: string): GraphQLFieldResolver<any, any, any> {
    return async (
      parent: any,
      args: { input: any; id: string },
      ctx: any,
      info: GraphQLResolveInfo,
    ) => {
      const principalId = this.principalIDFromRequest(ctx);
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
        principalId,
      });

      if (event) {
        await this.sendEvent({
          ...event,
          // data: newData,
          columns: getChangedColumns(event),
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
      const principalId = this.principalIDFromRequest(ctx);
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
        principalId,
      });

      if (event) {
        await this.sendEvent({
          ...event,
          // data: newData,
          columns: getChangedColumns(event),
        });
      }

      // this is double fetching of data - could be handled by applying diff
      return this.store.getEntityData({
        entity: resource,
        entityId: args.id,
      });
    };
  }
  async sendEvent(event: StoreAggregatedEvent) {
    await this.forwarder.send({ event });
    if (this.pubsub) {
      await this.pubsub.publish({
        event,
      });
    }
  }
}
