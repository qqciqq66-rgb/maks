# syntax=docker/dockerfile:1

FROM node:24-alpine AS webapp
WORKDIR /webapp
COPY webapp/package.json webapp/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY webapp/ ./
RUN npm run build

FROM node:24-alpine
ENV NODE_ENV=production \
    PORT=8080 \
    STATIC_DIR=/app/public \
    DATA_DIR=/app/data
WORKDIR /app
COPY server/package.json ./
COPY server/src ./src
COPY server/db ./db
COPY --from=webapp /webapp/dist ./public
RUN mkdir -p /app/data && chown -R node:node /app/data
USER node
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --retries=3 CMD wget -qO- http://127.0.0.1:8080/api/health || exit 1
CMD ["node", "src/index.js"]
