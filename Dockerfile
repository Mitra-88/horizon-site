FROM node:24-bookworm-slim AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ARG GITHUB_TOKEN
RUN npm run build

FROM node:24-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=8080
COPY --from=build --chown=node:node /app ./
RUN mkdir -p .data && chown node:node .data
USER node
EXPOSE 8080
CMD ["sh", "-c", "exec node_modules/.bin/next start -H 0.0.0.0 -p \"${PORT:-8080}\""]
