# syntax=docker/dockerfile:1

FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json yarn.lock ./
RUN corepack enable && yarn set version classic && yarn install --frozen-lockfile

FROM deps AS build
COPY tsconfig.json ./
COPY src ./src
RUN yarn build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ARG API_PORT=3001
ENV API_PORT=${API_PORT}
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json .
EXPOSE ${API_PORT}
CMD ["node", "dist/index.js"]

