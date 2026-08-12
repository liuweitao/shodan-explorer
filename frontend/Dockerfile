# syntax=docker/dockerfile:1.7

FROM node:26-alpine3.24@sha256:aadf416b2cdce311a8811ba3f0608a61b77dbf997500e2eafe781b51f6a0b019 AS build

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

FROM nginx:1.30.4-alpine3.24@sha256:97d490c12ba55b4946b01546d1c3ed324e8d41ab1c9fcb2a616aa470620e5b46 AS runtime

RUN rm -f /etc/nginx/conf.d/default.conf && \
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
