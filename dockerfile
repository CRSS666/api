FROM node:23-alpine AS build

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN apk add --no-cache make gcc g++ python3 py3-setuptools
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
COPY . .

RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install
RUN pnpm build

FROM node:23-alpine AS runner

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV NODE_ENV=production

RUN apk add --no-cache make gcc g++ python3 py3-setuptools
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
COPY data ./data
COPY --from=build /app/build ./build

RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --prod

EXPOSE 3000

CMD ["pnpm", "start"]
