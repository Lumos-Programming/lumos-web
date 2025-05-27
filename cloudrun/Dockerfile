FROM node:22 AS base

WORKDIR /app

RUN npm i -g pnpm

COPY package.json pnpm-lock.yaml ./

RUN pnpm install

COPY . .

RUN pnpm build

FROM node:22-alpine3.21 AS release

WORKDIR /app

RUN npm i -g pnpm

COPY --from=base /app/node_modules ./node_modules

COPY --from=base /app/package.json ./package.json

COPY --from=base /app/.next ./.next


CMD ["pnpm", "start"]
