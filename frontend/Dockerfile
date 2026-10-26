# ---- Build stage -------------------------------------------------------------------------------
FROM node:20.18.1-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
ARG VITE_API_BASE_URL=""
ARG VITE_CONTACT_EMAIL=""
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL VITE_CONTACT_EMAIL=$VITE_CONTACT_EMAIL
RUN npm run build

# ---- Runtime stage: static files behind nginx, /api proxied to the backend ---------------------
FROM nginx:1.27.3-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY security-headers.conf /etc/nginx/snippets/security-headers.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
