import {
  getNullableType,
  GraphQLObjectType,
  GraphQLType,
  GraphQLNonNull,
  GraphQLList,
  GraphQLOutputType,
  GraphQLID,
  assertOutputType,
  GraphQLInputType,
  assertInputType,
  GraphQLFieldConfigMap,
  GraphQLString,
  GraphQLInputFieldConfigMap,
  GraphQLInterfaceType,
  GraphQLEnumType,
  GraphQLEnumValueConfigMap,
} from 'graphql';
import { StoreEvent } from 'store/store-event.model';

const entityInterface = new GraphQLInterfaceType({
  name: 'Entity',
  fields: {
    id: {
      type: new GraphQLNonNull(GraphQLID),
    },
    createdAt: { type: new GraphQLNonNull(GraphQLString) },
    updatedAt: { type: GraphQLString },
  },
});

export class EntityField {
  constructor(private readonly config: { name: string; type: GraphQLType }) {}

  private isReference(): boolean {
    return getNullableType(this.config.type) instanceof GraphQLObjectType;
  }
  private isReferenceList(): boolean {
    return getNullableType(this.config.type) instanceof GraphQLList;
  }
  private isNonNull(): boolean {
    return this.config.type instanceof GraphQLNonNull;
  }

  get name(): string {
    return this.config.name;
  }

  get outputType(): GraphQLOutputType {
    if (this.isReference()) {
      return this.isNonNull() ? new GraphQLNonNull(GraphQLID) : GraphQLID;
    } else if (this.isReferenceList()) {
      const type = GraphQLID;
      return new GraphQLNonNull(
        new GraphQLList(this.isNonNull() ? new GraphQLNonNull(type) : type),
      );
    }
    return assertOutputType(this.config.type);
  }

  get inputType(): GraphQLInputType {
    if (this.isReference()) {
      return this.isNonNull() ? new GraphQLNonNull(GraphQLID) : GraphQLID;
    } else if (this.isReferenceList()) {
      const type = GraphQLID;
      return new GraphQLNonNull(
        new GraphQLList(this.isNonNull() ? new GraphQLNonNull(type) : type),
      );
    }
    return assertInputType(this.config.type);
  }
}

export class Entity {
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
        interfaces: [entityInterface],
        fields: this.outputFieldMap(),
      });
    }

    return this._objectType;
  }
}

export class ModelSchema {
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