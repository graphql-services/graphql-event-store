import request, { SuperTest } from 'supertest';
// import assert, { equal, notEqual } from 'assert';
import { Test } from '@nestjs/testing';
import { AppModule } from './../src/app.module';
import { INestApplication } from '@nestjs/common';

const jwtToken =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' +
  'eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ' +
  '.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
const principalId = '1234567890';

describe('EventSource', () => {
  let app: INestApplication;
  let test: SuperTest<any>;

  beforeEach(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    test = request(app.getHttpServer());
  });

  it('create entity', () => {
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
        expect(data.password).toEqual('xxx');
        expect(data.createdAt).not.toBeNull();
        expect(data.createdBy).toEqual(principalId);
        expect(data.updatedAt).toBeNull();
        expect(data.updatedBy).toBeNull();
        expect(data.deletedAt).toBeNull();
        expect(data.deletedBy).toBeNull();
        expect(data.principalId).not.toBeNull();
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
            expect(data2.password).toEqual('xxx');
            expect(data2.createdAt).not.toBeNull();
            expect(data2.createdBy).toEqual(principalId);
            expect(data2.updatedAt).not.toBeNull();
            expect(data2.updatedBy).toEqual(principalId);
            expect(data2.deletedAt).toBeNull();
            expect(data2.deletedBy).toBeNull();
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
            expect(data2.password).toEqual('xxx');
            expect(data2.createdAt).not.toBeNull();
            expect(data2.updatedAt).toBeNull();
            expect(data2.deletedAt).not.toBeNull();
            expect(data2.createdBy).toEqual(principalId);
            expect(data2.updatedBy).toBeNull();
            expect(data2.deletedBy).toEqual(principalId);
          });
      });
  });

  it('fetch events', () => {
    return test
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
      .expect(200)
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
              }
            }
            `,
          })
          .expect(200)
          .expect(res => {
            const data = res.body.data._events;
            expect(data.length).toBe(2);
            expect(data[0].principalId).not.toBeNull();
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
      });
  });
});
