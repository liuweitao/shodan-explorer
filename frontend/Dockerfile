# syntax=docker/dockerfile:1.7

FROM node:24-alpine3.24@sha256:e67514e5d0f6c46656005e1b693b2ec9d52e80b641307de684d4a015ba7a4eaf AS build

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm config set store-dir /pnpm/store && \
    pnpm install --frozen-lockfile

COPY . .
RUN pnpm run build

FROM nginx:1.31.4-alpine3.24@sha256:db35bfc6b2951e7f8a72db5db120288c127ffaeeb4a6d4b95a26fead017d5913 AS runtime

RUN apk upgrade --no-cache libcrypto3 libssl3 libexpat && \
    rm -f /etc/nginx/conf.d/default.conf && \
    mkdir -p /var/cache/nginx /docker-entrypoint.d && \
    chown -R nginx:nginx /var/cache/nginx /docker-entrypoint.d /usr/share/nginx/html

COPY nginx-main.conf /etc/nginx/nginx.conf
COPY nginx.conf /etc/nginx/templates/default.conf.template
COPY shodan-proxy-params.conf /etc/nginx/shodan-proxy-params.conf
COPY env.sh /docker-entrypoint.d/05-runtime-config.sh
COPY --from=build --chown=nginx:nginx /app/dist/ /usr/share/nginx/html/

RUN chmod 0555 /docker-entrypoint.d/05-runtime-config.sh

ENV NGINX_ENVSUBST_OUTPUT_DIR=/tmp/nginx-conf.d
ENV SHODAN_API_KEY=shodanproxy
ENV SHODAN_BASE_URL=http://shodan-proxy:8080

USER nginx

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget --quiet --output-document=/dev/null http://127.0.0.1:8080/healthz || exit 1

CMD ["nginx", "-g", "daemon off;"]
