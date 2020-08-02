FROM node:alpine
WORKDIR '/etc/recho'

COPY .yarn/ .yarn/
COPY .yarnrc.yml .yarnrc.yml
COPY yarn.lock yarn.lock
COPY package.json package.json
COPY recho-cpanel/package.json recho-cpanel/package.json
COPY recho-producer/package.json recho-producer/package.json

RUN yarn

CMD ["yarn", "start"]
