FROM node:20-bullseye AS build

WORKDIR /app

RUN corepack enable && corepack prepare yarn@1.22.22 --activate

COPY package.json yarn.lock lerna.json ./
COPY tsconfig.json tsconfig.paths.json tsconfig.server.json playwright.config.ts vitest.config.mts ./
COPY .editorconfig .eslintignore .eslintrc .prettierignore .prettierrc ./
COPY packages ./packages
COPY storage/plugins ./storage/plugins

RUN mkdir -p storage/uploads storage/db storage/logs
RUN yarn install --frozen-lockfile

COPY . .
RUN yarn build

FROM node:20-bullseye

WORKDIR /app

ENV NODE_ENV=production

RUN corepack enable && corepack prepare yarn@1.22.22 --activate

COPY --from=build /app /app

EXPOSE 13000

CMD ["sh", "-lc", "yarn start --port=${APP_PORT:-13000}"]