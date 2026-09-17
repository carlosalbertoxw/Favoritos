# syntax=docker/dockerfile:1

# --- Etapa 1: compilar la aplicación ---
FROM node:24-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# --- Etapa 2: servir el build con nginx ---
FROM nginx:stable-alpine

# URL del backend al que nginx reenvía las peticiones a /api/.
# host.docker.internal apunta a la máquina anfitriona (ver README).
ENV API_URL=http://host.docker.internal:5000

# La imagen oficial de nginx procesa las plantillas con envsubst al arrancar.
COPY docker/nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist/favoritos/browser /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1/health.json || exit 1
