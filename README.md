# graphql-event-store

[![Build Status](https://travis-ci.org/graphql-services/graphql-event-store.svg?branch=master)](https://travis-ci.org/graphql-services/graphql-event-store)
[![dependencies Status](https://david-dm.org/graphql-services/graphql-event-store/status.svg)](https://david-dm.org/graphql-services/graphql-event-store)

EventStore with GraphQL api

## Build

Dockerfile

```
FROM graphql/event-store
COPY graphql.schema /code/graphql.schema
```
