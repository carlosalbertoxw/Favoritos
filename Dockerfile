# syntax=docker/dockerfile:1

# --- Etapa 1: compilar la aplicación ---
FROM node:26-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# --- Etapa 2: servir el build con nginx, sin privilegios de root ---
FROM nginxinc/nginx-unprivileged:stable-alpine

# URL del backend al que nginx reenvía las peticiones a /api/.
# host.docker.internal apunta a la máquina anfitriona (ver README).
ENV API_URL=http://host.docker.internal:5000

# La imagen de nginx procesa las plantillas con envsubst al arrancar.
COPY docker/nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY docker/nginx/security-headers.conf /etc/nginx/snippets/security-headers.conf
COPY --from=build /app/dist/favoritos/browser /usr/share/nginx/html

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:8080/health.json
