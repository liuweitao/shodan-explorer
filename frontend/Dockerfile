# syntax=docker/dockerfile:1.7

FROM node:24.22.2-alpine3.24@sha256:8a32c8cf649a49915a66e81e7a609223c708d0adabf288ee3f4077d765542f85 AS build

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

FROM nginx:1.31.8-alpine3.24@sha256:785835ea65db4bba6f021acc0f3be91b0fef76a53fe41f8588c6698d2aed0606 AS runtime

RUN apk upgrade --no-cache && \
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
