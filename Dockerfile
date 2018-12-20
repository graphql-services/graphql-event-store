FROM node:8.9.0-alpine

WORKDIR /code

COPY . /code

RUN apk --no-cache add --virtual native-deps \
    g++ gcc libgcc libstdc++ linux-headers make python && \
    yarn add node-gyp -g && \
    yarn && yarn build && \
    rm -rf node_modules && yarn --production && \
    apk del native-deps

ENTRYPOINT []
CMD ["yarn","start:prod"]