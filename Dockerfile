FROM node:alpine
WORKDIR '/etc/recho'

COPY .yarn/ .yarn/
COPY .yarnrc.yml .yarnrc.yml
COPY package.json package.json
COPY yarn.lock yarn.lock

RUN yarn
RUN apk add tree

CMD ["yarn", "start"]
