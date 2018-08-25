import { Injectable, Module } from '@nestjs/common';
import {
  GraphQLSchema,
  parse,
  GraphQLObjectType,
  ObjectTypeDefinitionNode,
  GraphQLFieldConfigMap,
  assertOutputType,
  typeFromAST,
  buildSchema,
  GraphQLType,
  GraphQLFieldConfig,
  GraphQLID,
  GraphQLBoolean,
  GraphQLInputType,
  GraphQLInputObjectType,
  GraphQLOutputType,
  GraphQLNonNull,
  GraphQLInputFieldConfigMap,
  assertInputType,
  getNullableType,
  GraphQLString,
  GraphQLList,
  GraphQLEnumType,
  GraphQLEnumValueConfigMap,
} from 'graphql';
import { ResolverService } from './resolver.service';
import { StoreEvent } from 'store/base.store';

class EntityField {
  constructor(private readonly config: { name: string; type: GraphQLType }) {}

  get name(): string {
    return this.config.name;
  }
  get outputType(): GraphQLOutputType {
    return assertOutputType(this.config.type);
  }
  get inputType(): GraphQLInputType {
    return assertInputType(this.config.type);
  }
}
class Entity {
  constructor(
    private readonly config: { name: string; fields: EntityField[] },
  ) {}

  get name(): string {
    return this.config.name;
  }
  get fields(): EntityField[] {
    return this.config.fields;
  }
  outputFieldMap(): GraphQLFieldConfigMap<any, any> {
    const fields: GraphQLFieldConfigMap<any, any> = {};
    for (const field of this.fields) {
      fields[field.name] = { type: field.outputType };
    }
    fields.id = { type: new GraphQLNonNull(GraphQLID) };
    fields.createdAt = { type: new GraphQLNonNull(GraphQLString) };
    fields.updatedAt = { type: GraphQLString };
    return fields;
  }

  inputFieldMap(optionals: boolean = false): GraphQLInputFieldConfigMap {
    const fields: GraphQLInputFieldConfigMap = {};
    for (const field of this.fields) {
      fields[field.name] = {
        type: optionals ? getNullableType(field.inputType) : field.inputType,
      };
    }
    return fields;
  }

  private _objectType?: GraphQLObjectType;
  getObjectType(): GraphQLObjectType {
    if (!this._objectType) {
      this._objectType = new GraphQLObjectType({
        name: this.name,
        fields: this.outputFieldMap(),
      });
    }

    return this._objectType;
  }
}
class ModelSchema {
  constructor(private readonly config: { entities: Entity[] }) {}
  get entities(): Entity[] {
    return this.config.entities;
  }

  private entitiesEnumType?: GraphQLEnumType;
  getEntitiesEnumType(): GraphQLEnumType {
    if (!this.entitiesEnumType) {
      const values: GraphQLEnumValueConfigMap = {};
      for (const entity of this.config.entities) {
        values[entity.name] = { value: entity.name };
      }

      this.entitiesEnumType = new GraphQLEnumType({
        values,
        name: 'EventEntities',
      });
    }
    return this.entitiesEnumType;
  }

  private eventType?: GraphQLOutputType;
  getEventType(): GraphQLOutputType {
    if (!this.eventType) {
      this.eventType = new GraphQLNonNull(
        new GraphQLList(
          new GraphQLObjectType({
            name: 'Event',
            fields: {
              id: { type: new GraphQLNonNull(GraphQLID) },
              entityId: { type: new GraphQLNonNull(GraphQLID) },
              entity: { type: new GraphQLNonNull(this.getEntitiesEnumType()) },
              data: {
                type: new GraphQLNonNull(GraphQLString),
                resolve: (event: StoreEvent): string =>
                  JSON.stringify(event.data),
              },
              type: {
                type: new GraphQLNonNull(
                  new GraphQLEnumType({
                    name: 'EventType',
                    values: {
                      CREATED: { value: 'CREATED' },
                      UPDATED: { value: 'UPDATED' },
                      DELETED: { value: 'DELETED' },
                    },
                  }),
                ),
              },
              date: { type: new GraphQLNonNull(GraphQLString) },
            },
          }),
        ),
      );
    }
    return this.eventType;
  }
}

@Injectable()
export class ModelService {
  constructor(private readonly resolverService: ResolverService) {}

  parseModelSchema(string: string): ModelSchema {
    const schema = buildSchema(string);
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
        data: {
          type: new GraphQLNonNull(
            new GraphQLInputObjectType({
              name: `${entity.name}CreateInput`,
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
        data: {
          type: new GraphQLNonNull(
            new GraphQLInputObjectType({
              name: `${entity.name}UpdateInput`,
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
      queryFields[entity.name.toLocaleLowerCase()] = this.readForEntity(entity);
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
