FROM node:8.9.0-alpine

WORKDIR /code

COPY package.json /code/package.json
COPY yarn.lock /code/yarn.lock

RUN apk --no-cache add --virtual native-deps \
    g++ gcc libgcc libstdc++ linux-headers make python && \
    yarn add node-gyp -g && \
    rm -rf node_modules && \
    yarn && \
    apk del native-deps

COPY . /code

ENTRYPOINT []
CMD ["yarn","start"]