# Build stage
FROM node:14 AS build-stage
WORKDIR /app
COPY package*.json ./
RUN npm install
RUN npm install vue-json-pretty
COPY . .
RUN npm run build

# Production stage
FROM nginx:stable-alpine AS production-stage
COPY --from=build-stage /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/templates/default.conf.template
EXPOSE 80

# Copy env.sh
COPY env.sh /docker-entrypoint.d/40-env.sh
RUN chmod +x /docker-entrypoint.d/40-env.sh

# Declare environment variables
ENV SHODAN_API_KEY=
ENV SHODAN_BASE_URL=

CMD ["nginx", "-g", "daemon off;"]
