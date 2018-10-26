import request, { SuperTest } from 'supertest';
// import assert, { equal, notEqual } from 'assert';
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';

import { AppModule } from './../src/app.module';
import { ForwarderFactory } from '../src/forwader/forwarder.factory';
import {
  ForwarderService,
  ForwarderMessage,
} from '../src/forwader/forwarder.service';
import { StoreEvent } from '../src/store/store-event.model';
import { PubSubService, PubSubMessage } from '../src/pubsub/pubsub.service';
import { PubSubFactory } from '../src/pubsub/pubsub.factory';
import { sha512 } from 'js-sha512';

const jwtToken =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' +
  'eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ' +
  '.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
const principalId = '1234567890';

class ForwarderServiceProxy extends ForwarderService {
  public sentMessages: ForwarderMessage[] = [];
  async send(message: ForwarderMessage) {
    this.sentMessages.push(message);
  }
}

class PubsubServiceProxy extends PubSubService {
  public publishedMessages: PubSubMessage[] = [];
  async publish(message: PubSubMessage): Promise<any> {
    this.publishedMessages.push(message);
  }
}

describe('EventSource', () => {
  let app: INestApplication;
  let test: SuperTest<any>;
  let forwardService: ForwarderServiceProxy;
  let pubsubService: PubsubServiceProxy;

  beforeEach(async () => {
    forwardService = new ForwarderServiceProxy({
      urls: ['http://example.com'],
    });
    pubsubService = new PubsubServiceProxy({ url: 'http://example.com' });

    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(ForwarderFactory)
      .useValue({
        getService: () => {
          return forwardService;
        },
      })
      .overrideProvider(PubSubFactory)
      .useValue({
        isServiceEnabled: () => {
          return true;
        },
        getService: () => {
          return pubsubService;
        },
      })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    test = request(app.getHttpServer());
  });

  it('create entity', () => {
    return test
      .post('/graphql')
      .send({
        query: `
        mutation {
          createUser(input: {
            username: "john.doe",
            age: 21
          }) {
            id
            username
            age
            createdAt
            updatedAt
            deletedAt
            createdBy
            updatedBy
            deletedBy
          }
        }
        `,
      })
      .expect(200)
      .expect(res => {
        const data = res.body.data.createUser;
        expect(data.username).toEqual('john.doe');
        expect(data.age).toEqual(21);
        expect(data.createdAt).not.toBeNull();
        expect(data.updatedAt).toBeNull();
        expect(data.updatedBy).toBeNull();
        expect(data.deletedAt).toBeNull();
        expect(data.deletedBy).toBeNull();
        expect(data.principalId).not.toBeNull();

        expect(forwardService.sentMessages.length).toEqual(1);
        expect(forwardService.sentMessages[0].event.columns).toEqual([
          'username',
          'age',
        ]);
        expect(pubsubService.publishedMessages.length).toEqual(1);
        expect(pubsubService.publishedMessages[0].event.columns).toEqual([
          'username',
          'age',
        ]);
      });
  });

  it('create entity with jwt token', () => {
    return test
      .post('/graphql')
      .set('authorization', `Bearer ${jwtToken}`)
      .send({
        query: `
        mutation {
          createUser(input: {
            username: "john.doe",
            password: "xxx"
          }) {
            id
            username
            password
            roles_ids
            createdAt
            updatedAt
            deletedAt
            createdBy
            updatedBy
            deletedBy
          }
        }
        `,
      })
      .expect(200)
      .expect(res => {
        expect(res.body.data.errors).toBeUndefined();
        const data = res.body.data.createUser;
        expect(data.password).toEqual(sha512('xxx'));
        expect(data.createdBy).toEqual(principalId);
        expect(data.principalId).not.toBeNull();
        expect(forwardService.sentMessages.length).toEqual(1);
        expect(forwardService.sentMessages[0].event.columns).toEqual([
          'username',
          'password',
        ]);
        expect(pubsubService.publishedMessages.length).toEqual(1);
        expect(pubsubService.publishedMessages[0].event.columns).toEqual([
          'username',
          'password',
        ]);
      });
  });
  it('create entity with invalid jwt token', () => {
    return test
      .post('/graphql')
      .set('authorization', `Bearer invalid_token`)
      .send({
        query: `
        mutation {
          createUser(input: {
            username: "john.doe",
            password: "xxx"
          }) {
            id
            username
            password
            createdAt
            updatedAt
            deletedAt
            createdBy
            updatedBy
            deletedBy
          }
        }
        `,
      })
      .expect(200)
      .expect(res => {
        const data = res.body.data.createUser;
        expect(data.principalId).not.toBeNull();
        expect(forwardService.sentMessages.length).toEqual(1);
        expect(forwardService.sentMessages[0].event.columns).toEqual([
          'username',
          'password',
        ]);
        expect(pubsubService.publishedMessages.length).toEqual(1);
        expect(pubsubService.publishedMessages[0].event.columns).toEqual([
          'username',
          'password',
        ]);
      });
  });

  it('update entity', () => {
    return test
      .post('/graphql')
      .set('authorization', `Bearer ${jwtToken}`)
      .send({
        query: `
        mutation {
          createUser(input: {
            username: "john.doe",
            password: "xxx"
          }) {
            id
            username
            password
          }
        }
        `,
      })
      .expect(200)
      .then(res => {
        const data = res.body.data.createUser;
        return test
          .post('/graphql')
          .set('authorization', `Bearer ${jwtToken}`)
          .send({
            query: `
            mutation ($id: ID!, $input: UserRawUpdateInput!) {
              updateUser(id: $id, input: $input) {
                id
                username
                password
                createdAt
                createdBy
                updatedAt
                updatedBy
                deletedAt
                deletedBy
              }
            }
            `,
            variables: {
              id: data.id,
              input: {
                username: 'john.doe2',
              },
            },
          })
          .expect(200)
          .expect(res2 => {
            const data2 = res2.body.data.updateUser;
            expect(data2.username).toEqual('john.doe2');
            expect(data2.password).toEqual(sha512('xxx'));
            expect(data2.createdAt).not.toBeNull();
            expect(data2.createdBy).toEqual(principalId);
            expect(data2.updatedAt).not.toBeNull();
            expect(data2.updatedBy).toEqual(principalId);
            expect(data2.deletedAt).toBeNull();
            expect(data2.deletedBy).toBeNull();

            expect(forwardService.sentMessages.length).toEqual(2);
            expect(forwardService.sentMessages[0].event.columns).toEqual([
              'username',
              'password',
            ]);
            expect(forwardService.sentMessages[1].event.columns).toEqual([
              'username',
            ]);
            expect(pubsubService.publishedMessages.length).toEqual(2);
            expect(pubsubService.publishedMessages[0].event.columns).toEqual([
              'username',
              'password',
            ]);
            expect(pubsubService.publishedMessages[1].event.columns).toEqual([
              'username',
            ]);
          });
      });
  });

  it('delete entity', () => {
    return test
      .post('/graphql')
      .set('authorization', `Bearer ${jwtToken}`)
      .send({
        query: `
        mutation {
          createUser(input: {
            username: "john.doe",
            password: "xxx"
          }) {
            id
            username
            password
          }
        }
        `,
      })
      .expect(200)
      .then(res => {
        const data = res.body.data.createUser;
        return test
          .post('/graphql')
          .set('authorization', `Bearer ${jwtToken}`)
          .send({
            query: `
            mutation ($id: ID!) {
              deleteUser(id: $id) {
                id
                username
                password
                createdAt
                updatedAt
                deletedAt
                createdBy
                updatedBy
                deletedBy
              }
            }
            `,
            variables: {
              id: data.id,
            },
          })
          .expect(200)
          .expect(res2 => {
            const data2 = res2.body.data.deleteUser;
            expect(data2.username).toEqual('john.doe');
            expect(data2.password).toEqual(sha512('xxx'));
            expect(data2.createdAt).not.toBeNull();
            expect(data2.updatedAt).toBeNull();
            expect(data2.deletedAt).not.toBeNull();
            expect(data2.createdBy).toEqual(principalId);
            expect(data2.updatedBy).toBeNull();
            expect(data2.deletedBy).toEqual(principalId);
            expect(forwardService.sentMessages.length).toEqual(2);

            expect(forwardService.sentMessages.length).toEqual(2);
            expect(forwardService.sentMessages[0].event.columns).toEqual([
              'username',
              'password',
            ]);
            expect(forwardService.sentMessages[1].event.columns).toEqual([]);
            expect(pubsubService.publishedMessages.length).toEqual(2);
            expect(pubsubService.publishedMessages[0].event.columns).toEqual([
              'username',
              'password',
            ]);
            expect(pubsubService.publishedMessages[1].event.columns).toEqual(
              [],
            );
          });
      });
  });

  it('fetch events', () => {
    return (
      test
        .post('/graphql')
        .set('authorization', `Bearer ${jwtToken}`)
        .send({
          query: `
            mutation {
              user1:createUser(input: {
                username: "john.doe",
                password: "xxx"
              }) {
                id
                username
                password
              }
              user2:createUser(input: {
                username: "jane.siri",
                password: "nothingspecial"
              }) {
                id
                username
                password
              }
            }
            `,
        })
        // .expect(200)
        .then(() => {
          return test
            .post('/graphql')
            .send({
              query: `
            query {
              _events {
                id
                entity
                entityId
                type
                cursor
                principalId
                columns
              }
            }
            `,
            })
            .expect(200)
            .expect(res => {
              const data = res.body.data._events;
              expect(data.length).toBe(2);
              expect(data[0].principalId).not.toBeNull();
              expect(data[0].columns).toEqual(['username', 'password']);
            })
            .then(res => {
              const data = res.body.data._events;
              return test
                .post('/graphql')
                .send({
                  query: `
                query {
                  _events(cursor:"${data[0].cursor}",limit:1) {
                    id
                    principalId
                  }
                }
                `,
                })
                .expect(200)
                .expect(res2 => {
                  const data2 = res2.body.data._events;
                  expect(data2.length).toBe(1);
                  expect(data[0].principalId).toEqual(principalId);
                  expect(data2[0].principalId).toEqual(principalId);
                });
            });
        })
    );
  });
});
