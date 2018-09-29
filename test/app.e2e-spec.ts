import request, { SuperTest } from 'supertest';
// import assert, { equal, notEqual } from 'assert';
import { Test } from '@nestjs/testing';
import { AppModule } from './../src/app.module';
import { INestApplication } from '@nestjs/common';

describe('EventSource', () => {
  let app: INestApplication;
  let test: SuperTest<any>;

  beforeAll(async () => {
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
          }
        }
        `,
      })
      .expect(200)
      .expect(res => {
        const data = res.body.data.createUser;
        expect(data.username).toEqual('john.doe');
        expect(data.password).toEqual('xxx');
        expect(data.updatedAt).toBeNull();
        expect(data.createdAt).not.toBeNull();
        expect(data.deletedAt).toBeNull();
      });
  });

  it('update entity', () => {
    return test
      .post('/graphql')
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
          .send({
            query: `
            mutation ($id: ID!, $input: UserRawUpdateInput!) {
              updateUser(id: $id, input: $input) {
                id
                username
                password
                createdAt
                updatedAt
                deletedAt
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
            expect(data2.updatedAt).not.toBeNull();
            expect(data2.createdAt).not.toBeNull();
            expect(data2.deletedAt).toBeNull();
          });
      });
  });

  it('delete entity', () => {
    return test
      .post('/graphql')
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
            expect(data2.updatedAt).toBeNull();
            expect(data2.createdAt).not.toBeNull();
            expect(data2.deletedAt).not.toBeNull();
          });
      });
  });
});
