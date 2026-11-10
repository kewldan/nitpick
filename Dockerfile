# Nitpick: one container, one SQLite file in /data.
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:24-alpine
LABEL org.opencontainers.image.source=https://github.com/kewldan/nitpick
WORKDIR /app
ENV NODE_ENV=production PORT=8787 HOST=0.0.0.0 DATA_DIR=/data
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
COPY server ./server
COPY shared ./shared
RUN mkdir -p /data && chown node:node /data
VOLUME /data
EXPOSE 8787
USER node
HEALTHCHECK --interval=15s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8787/api/health >/dev/null || exit 1
CMD ["node", "server/index.ts"]
