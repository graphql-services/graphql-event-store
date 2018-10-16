import {
  Module,
  NestModule,
  MiddlewareConsumer,
  RequestMethod,
} from '@nestjs/common';
import { AppService } from './app.service';
import { graphqlExpress } from 'apollo-server-express';
import expressPlayground from 'graphql-playground-middleware-express';
import { GraphQLModule } from '@nestjs/graphql';
import { ModelService } from './graphql/model.service';
import { ResolverService } from './graphql/resolver.service';
import { StoreFactoryProvider } from './store/store.factory';
import { PubSubFactory } from './pubsub/pubsub.factory';
import { ForwarderFactory } from './forwader/forwarder.factory';

@Module({
  imports: [GraphQLModule],
  providers: [
    AppService,
    ModelService,
    ResolverService,
    StoreFactoryProvider,
    PubSubFactory,
    ForwarderFactory,
  ],
})
export class AppModule implements NestModule {
  constructor(private readonly appService: AppService) {}

  configure(consumer: MiddlewareConsumer) {
    const schema = this.appService.getSchema();
    consumer
      .apply(
        graphqlExpress(req => ({
          schema,
          rootValue: req,
          tracing: true,
          context: req,
        })),
      )
      .forRoutes({ path: '/graphql', method: RequestMethod.POST })
      .apply(expressPlayground({ endpoint: '/graphql' }))
      .forRoutes({ path: '/graphql', method: RequestMethod.GET });
  }
}
