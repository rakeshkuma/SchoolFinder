# ---- Build stage -------------------------------------------------------------------------------
FROM node:24.22.2-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
ARG VITE_API_BASE_URL=""
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
RUN npm run build

# ---- Runtime stage: static files behind nginx, /api proxied to the backend ---------------------
FROM nginx:1.30.6-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY security-headers.conf /etc/nginx/snippets/security-headers.conf
# Where nginx keeps the last good copy of public API answers (see proxy_cache_path in nginx.conf).
RUN mkdir -p /var/cache/schooldhundo-api && chown nginx:nginx /var/cache/schooldhundo-api
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
