import { Injectable } from '@nestjs/common';
import {
  GraphQLSchema,
  parse,
  GraphQLObjectType,
  ObjectTypeDefinitionNode,
  GraphQLFieldConfigMap,
  typeFromAST,
  buildSchema,
  GraphQLFieldConfig,
  GraphQLID,
  GraphQLBoolean,
  GraphQLInputObjectType,
  GraphQLNonNull,
} from 'graphql';
import { ResolverService } from './resolver.service';
import { ModelSchema, Entity, EntityField } from './model.schema';
import { camelCase } from 'voca';

@Injectable()
export class ModelService {
  constructor(private readonly resolverService: ResolverService) {}

  parseModelSchema(string: string): ModelSchema {
    const schema = buildSchema(`scalar DateTime\n${string}`);
    const document = parse(string);

    const entities: Entity[] = [];
    for (const _def of document.definitions) {
      if (_def.kind === 'ObjectTypeDefinition') {
        const def = _def as ObjectTypeDefinitionNode;
        const name = def.name.value;
        const fields = def.fields.map(field => {
          const type = typeFromAST(schema, field.type);
          return new EntityField({ type, name: field.name.value });
        });
        entities.push(new Entity({ name, fields }));
      }
    }
    return new ModelSchema({ entities });
  }

  readForEntity(entity: Entity): GraphQLFieldConfig<any, any> {
    return {
      type: entity.getObjectType(),
      args: { id: { type: new GraphQLNonNull(GraphQLID) } },
      resolve: this.resolverService.readResolver(entity.name),
    };
  }
  createForEntity(entity: Entity): GraphQLFieldConfig<any, any> {
    return {
      type: new GraphQLNonNull(entity.getObjectType()),
      args: {
        input: {
          type: new GraphQLNonNull(
            new GraphQLInputObjectType({
              name: `${entity.name}RawCreateInput`,
              fields: entity.inputFieldMap(),
            }),
          ),
        },
      },
      resolve: this.resolverService.createResolver(entity.name),
    };
  }
  updateForEntity(entity: Entity): GraphQLFieldConfig<any, any> {
    return {
      type: entity.getObjectType(),
      args: {
        id: { type: new GraphQLNonNull(GraphQLID) },
        input: {
          type: new GraphQLNonNull(
            new GraphQLInputObjectType({
              name: `${entity.name}RawUpdateInput`,
              fields: entity.inputFieldMap(true),
            }),
          ),
        },
      },
      resolve: this.resolverService.updateResolver(entity.name),
    };
  }
  deleteForEntity(entity: Entity): GraphQLFieldConfig<any, any> {
    return {
      type: GraphQLBoolean,
      args: { id: { type: new GraphQLNonNull(GraphQLID) } },
      resolve: this.resolverService.deleteResolver(entity.name),
    };
  }

  getGraphQLSchema(modelSchema: ModelSchema): GraphQLSchema {
    const queryFields: GraphQLFieldConfigMap<any, any> = {};
    const mutationFields: GraphQLFieldConfigMap<any, any> = {};

    for (const entity of modelSchema.entities) {
      queryFields[camelCase(entity.name)] = this.readForEntity(entity);
      mutationFields[`create${entity.name}`] = this.createForEntity(entity);
      mutationFields[`update${entity.name}`] = this.updateForEntity(entity);
      mutationFields[`delete${entity.name}`] = this.deleteForEntity(entity);
    }

    queryFields._events = {
      type: modelSchema.getEventType(),
      args: {
        id: { type: GraphQLID },
        entity: { type: modelSchema.getEntitiesEnumType() },
      },
      resolve: this.resolverService.eventsResolver(),
    };

    const schema = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: queryFields,
      }),
      mutation: new GraphQLObjectType({
        name: 'Mutation',
        fields: mutationFields,
      }),
    });
    return schema;
  }
}
