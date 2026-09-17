# Favoritos

[![CI](https://github.com/carlosalbertoxw/Favoritos/actions/workflows/ci.yml/badge.svg)](https://github.com/carlosalbertoxw/Favoritos/actions/workflows/ci.yml)

Frontend en **Angular 22** para guardar páginas favoritas (marcadores). Consume la API RESTful de [Api-restful-favoritos](https://github.com/carlosalbertoxw/Api-restful-favoritos) (Node.js + Express + MongoDB).

Aplicación CRUD: listar, ver, agregar, editar y eliminar marcadores.

## Contenido

- [Stack](#stack)
- [Inicio rápido](#inicio-rápido)
- [Desarrollo local](#desarrollo-local)
- [Docker](#docker)
- [Configuración de la API](#configuración-de-la-api)
- [Rutas de la aplicación](#rutas-de-la-aplicación)
- [Estructura del proyecto](#estructura-del-proyecto)
- [Scripts](#scripts)
- [Pruebas](#pruebas)
- [Integración continua](#integración-continua)
- [Healthcheck](#healthcheck)
- [Solución de problemas](#solución-de-problemas)
- [Mantenimiento de dependencias](#mantenimiento-de-dependencias)

## Stack

- **Angular 22.1** (standalone components, zoneless, signals, control-flow `@if`/`@for`)
- **TypeScript 6.0**
- **RxJS 7** + `HttpClient` (`provideHttpClient(withFetch())`)
- Formularios reactivos tipados
- **Vitest 4** + **jsdom** para pruebas, con cobertura vía `@vitest/coverage-v8`
- **ESLint 10** + `angular-eslint` para lint, **Prettier** para formato
- **Docker** + **nginx** para servir el build de producción
- **GitHub Actions** para integración continua

## Inicio rápido

Se asume que ambos repositorios están clonados en la misma carpeta:

```
ProyectosDesarrollo/
├── Api-restful-favoritos/   API (puerto 5000) + MongoDB (27017)
└── Favoritos/               este repositorio
```

| Opción | Requisitos | URL | Ideal para |
| ------ | ---------- | --- | ---------- |
| [Todo con Docker](#con-la-api-de-api-restful-favoritos-recomendado) | Docker con Compose v2 | `http://localhost:8090` | Probar la aplicación completa sin instalar Node |
| [Desarrollo local](#desarrollo-local) | Node.js + Docker (para la API) | `http://localhost:4200` | Modificar el frontend con recarga automática |

Camino más corto con Docker:

```bash
cd ../Api-restful-favoritos && docker compose up -d --build
```

```bash
docker compose -f docker-compose.yml -f docker-compose.api.yml up -d --build
```

Abre `http://localhost:8090`.

## Desarrollo local

### Requisitos

- **Node.js** `^22.22.3`, `^24.15.0` o `>=26` (requerido por Angular 22; el CI y la imagen Docker usan Node 24)
- **npm 11** (el proyecto declara `packageManager: npm@11.16.0`)
- La API corriendo en `http://localhost:5000`

### 1. Levanta la API

Desde `Api-restful-favoritos` (API + MongoDB en Docker):

```bash
docker compose up -d --build
```

Comprueba que está lista:

```bash
curl http://localhost:5000/health/ready
```

Debe responder `{"status":"ok","checks":{"database":"up"}}`. También puedes ejecutar la API con Node; consulta el README de ese repositorio.

### 2. Instala y arranca el frontend

```bash
npm ci
```

```bash
npm start
```

Abre `http://localhost:4200/`. La app recarga al cambiar los archivos fuente y llama directamente a `http://localhost:5000/api`.

Usa `npm ci` para instalar exactamente las versiones de `package-lock.json`, y `npm install` solo cuando agregues o actualices dependencias.

> En desarrollo el frontend (`localhost:4200`) y la API (`localhost:5000`) están en orígenes distintos. La API permite todos los orígenes por defecto (`CORS_ORIGIN=*`); si la restringes, incluye `http://localhost:4200`.

## Docker

La imagen se construye en dos etapas: compila la app con Node 24 y sirve el resultado con **nginx**. nginx hace el fallback de rutas de la SPA, reenvía `/api/` al backend y expone un `HEALTHCHECK` sobre `/health.json`.

Requisitos: Docker 20.10+ con Docker Compose v2.

### Con la API de Api-restful-favoritos (recomendado)

Levanta la aplicación completa, cada proyecto con su propio `docker-compose.yml`.

**1. Levanta la API** (desde `Api-restful-favoritos`):

```bash
docker compose up -d --build
```

Espera a que `docker compose ps` muestre `favoritos-api` y `favoritos-mongo` como `healthy`.

**2. Levanta el frontend** (desde `Favoritos`):

```bash
docker compose -f docker-compose.yml -f docker-compose.api.yml up -d --build
```

**3. Verifica** que todo responde, incluida la API a través del proxy:

```bash
node scripts/healthcheck.mjs http://localhost:8090 --with-api
```

Abre `http://localhost:8090`.

Cómo funciona: [`docker-compose.api.yml`](docker-compose.api.yml) une el contenedor `web` a la red de Docker de la API (`api-restful-favoritos_default`) y fija `API_URL=http://api:5000`. nginx llama a la API por nombre de servicio dentro de Docker, sin pasar por la máquina anfitriona y sin CORS.

```
Navegador ──► localhost:8090 ──► web (nginx) ──/api/*──► api:5000 ──► mongo:27017
                                   └──── red api-restful-favoritos_default ────┘
```

| Contenedor        | Proyecto de Compose     | Puerto en el anfitrión |
| ----------------- | ----------------------- | ---------------------- |
| `favoritos`       | `favoritos`             | `8090`                 |
| `favoritos-api`   | `api-restful-favoritos` | `5000`                 |
| `favoritos-mongo` | `api-restful-favoritos` | `27017`                |

Para detener todo:

```bash
docker compose -f docker-compose.yml -f docker-compose.api.yml down
```

```bash
cd ../Api-restful-favoritos && docker compose down
```

Notas:

- **Orden de arranque:** la API debe estar corriendo antes que el frontend (ver [Solución de problemas](#solución-de-problemas)).
- **Si recreas la API** (`docker compose down` + `up`), su red y sus IPs cambian; recrea también el frontend con `docker compose -f docker-compose.yml -f docker-compose.api.yml up -d --force-recreate`.
- **Otro nombre de carpeta:** la red se llama `<carpeta-de-la-API>_default`. Si clonaste la API con otro nombre, indícalo con `API_NETWORK`, p. ej. `API_NETWORK=mi-api_default`.
- **Datos:** los favoritos se guardan en el volumen `mongo-data` del proyecto de la API; `docker compose down -v` en ese repositorio los borra.

### Solo el frontend (Docker Compose)

Útil si la API corre fuera de Docker. Por defecto nginx reenvía `/api/` al puerto 5000 de la máquina anfitriona.

```bash
docker compose up -d --build
```

La app queda en `http://localhost:8090`. Para ver el estado (debe llegar a `healthy`) y los logs:

```bash
docker compose ps
```

```bash
docker compose logs -f
```

Para detenerla:

```bash
docker compose down
```

### Con Docker (sin Compose)

```bash
docker build -t favoritos .
```

```bash
docker run -d --name favoritos -p 8090:80 --add-host=host.docker.internal:host-gateway -e API_URL=http://host.docker.internal:5000 favoritos
```

### Variables

| Variable      | Dónde                    | Valor por defecto                  | Descripción                                             |
| ------------- | ------------------------ | ---------------------------------- | ------------------------------------------------------- |
| `API_URL`     | Contenedor               | `http://host.docker.internal:5000` | Backend al que nginx reenvía `/api/*` (sin barra final) |
| `WEB_PORT`    | `docker-compose.yml`     | `8090`                             | Puerto de la máquina anfitriona donde se publica la app |
| `API_NETWORK` | `docker-compose.api.yml` | `api-restful-favoritos_default`    | Red de Docker de la API a la que se une el frontend     |

Con `docker-compose.api.yml`, `API_URL` queda fijado en `http://api:5000`.

Ejemplo con otro backend y otro puerto:

```bash
API_URL=http://mi-backend:3000 WEB_PORT=9000 docker compose up -d --build
```

En PowerShell define las variables antes (`$env:API_URL="http://mi-backend:3000"; $env:WEB_PORT="9000"`) o colócalas en un archivo `.env` junto a `docker-compose.yml`.

### Cómo se conecta con la API

En producción la app llama a `/api` (mismo origen), así que no hace falta CORS. nginx reenvía la ruta completa: `GET http://localhost:8090/api/favoritos` → `GET ${API_URL}/api/favoritos`.

- **Api-restful-favoritos en Docker**: usa `docker-compose.api.yml` (ver [arriba](#con-la-api-de-api-restful-favoritos-recomendado)).
- **Backend en tu máquina** (p. ej. `npm run dev` en `localhost:5000`): funciona con el valor por defecto. `host.docker.internal` apunta al anfitrión; `extra_hosts`/`--add-host` lo hacen funcionar también en Linux. El backend debe escuchar en `0.0.0.0`, no solo en `127.0.0.1`.
- **Backend en otro contenedor**: únelo a la misma red y usa su nombre de servicio, p. ej. `API_URL=http://api:5000`.

Solo se reenvía `/api/`. Los endpoints de salud (`/health`, `/health/ready`) y la documentación (`/docs`) de la API se consultan directamente en `http://localhost:5000`.

### Archivos

| Archivo                                                                    | Propósito                                                               |
| -------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| [`Dockerfile`](Dockerfile)                                                 | Build multi-stage (Node → nginx) y `HEALTHCHECK`                        |
| [`docker/nginx/default.conf.template`](docker/nginx/default.conf.template) | Fallback de SPA, proxy `/api/`, caché y gzip                            |
| [`docker-compose.yml`](docker-compose.yml)                                 | Servicio `web` con puerto, `API_URL` y acceso al anfitrión              |
| [`docker-compose.api.yml`](docker-compose.api.yml)                         | Une `web` a la red de Api-restful-favoritos (`API_URL=http://api:5000`) |
| [`.dockerignore`](.dockerignore)                                           | Excluye `node_modules`, `dist`, `coverage`, etc. del contexto           |

Caché en nginx: los `.js`/`.css` (con hash en el nombre) se cachean un año; `index.html` usa `no-cache` y `health.json` `no-store`, para que un nuevo despliegue se vea de inmediato.

## Configuración de la API

La URL de la API se define en los archivos de entorno:

| Entorno    | Archivo                                                                        | `apiUrl`                    |
| ---------- | ------------------------------------------------------------------------------ | --------------------------- |
| Desarrollo | [`src/environments/environment.ts`](src/environments/environment.ts)           | `http://localhost:5000/api` |
| Producción | [`src/environments/environment.prod.ts`](src/environments/environment.prod.ts) | `/api`                      |

El build de producción (y por tanto la imagen Docker) reemplaza `environment.ts` por `environment.prod.ts` (ver `fileReplacements` en [`angular.json`](angular.json)). Con `/api` la app necesita un proxy en el mismo origen, como el nginx de la imagen Docker.

### Contrato de la API

Rutas relativas a `apiUrl`. La especificación completa está en la documentación Swagger de la API: `http://localhost:5000/docs`.

| Método | Ruta            | Cuerpo                    | Respuesta exitosa             | Errores       |
| ------ | --------------- | ------------------------- | ----------------------------- | ------------- |
| GET    | `/favoritos`    | —                         | `200 { favoritos: [...] }`    | —             |
| GET    | `/favorito/:id` | —                         | `200 { favorito: {...} }`     | `400`, `404`  |
| POST   | `/favorito`     | `{ title, description?, url }` | `201 { favorito: {...} }` | `400`         |
| PUT    | `/favorito/:id` | Campos a actualizar (parcial) | `200 { favorito: {...} }` | `400`, `404`  |
| DELETE | `/favorito/:id` | —                         | `200 { message: "..." }`      | `400`, `404`  |

- `GET /favoritos` devuelve los marcadores del más reciente al más antiguo.
- Cada favorito incluye `id`, `title`, `description`, `url`, `createdAt` y `updatedAt`.
- Los errores responden `{ message }`; los de validación (`400`) añaden `errors: [{ path, message }]`.

Modelo en el frontend ([`src/app/models/favorito.ts`](src/app/models/favorito.ts)):

```ts
interface Favorito {
  id?: string;        // asignado por la API
  title: string;
  description: string;
  url: string;
}
```

### Validaciones

El formulario aplica las mismas reglas que la API, así que los datos inválidos se detectan antes de enviarlos:

| Campo         | Regla (frontend y API)                                                  |
| ------------- | ----------------------------------------------------------------------- |
| `title`       | Obligatorio, máximo 200 caracteres                                      |
| `description` | Opcional, máximo 1000 caracteres                                        |
| `url`         | Obligatoria, debe empezar con `http://` o `https://` y ser una URL válida |

- Como en la API, los espacios al inicio y al final no cuentan: un título con solo espacios es inválido, y los valores se envían recortados.
- **URL:** se comprueba en el mismo orden que la API y con los mismos dos errores: primero que empiece literalmente con `http://` o `https://` (sin distinguir mayúsculas), lo que descarta `javascript:`, `data:`, `file:`, `mailto:`, `ftp://` o `https:/x`; después, que se pueda interpretar como URL (descarta `http://`, `http://a b.com` o puertos inválidos).
- **Errores de la API:** si aun así la API responde `400` con `errors: [{ path, message }]`, cada mensaje se muestra bajo su campo y arriba aparece "Error al guardar el favorito. Revisa los campos marcados.". Otros errores muestran el mensaje de la API (p. ej. "Error al actualizar el favorito. No existe el marcador.").

Los validadores, los mensajes y el manejo de errores de la API están en [`src/app/favorito-form/favorito-form.validators.ts`](src/app/favorito-form/favorito-form.validators.ts), y los campos en el componente compartido `app-favorito-form`, que usan el alta y la edición.

## Rutas de la aplicación

| Ruta                   | Componente       | Descripción                                |
| ---------------------- | ---------------- | ------------------------------------------ |
| `/`                    | `FavoritosList`  | Listado; permite eliminar con confirmación |
| `/favorito/:id`        | `FavoritoDetail` | Detalle de un favorito                     |
| `/agregar-favorito`    | `FavoritoAdd`    | Formulario de alta                         |
| `/editar-favorito/:id` | `FavoritoEdit`   | Formulario de edición                      |
| cualquier otra         | —                | Redirige a `/`                             |

Si el detalle o la edición no encuentran el favorito (o la API falla), se redirige a `/`.

## Estructura del proyecto

```
.github/workflows/ci.yml     Pipeline de integración continua
docker/nginx/                Configuración de nginx para la imagen Docker
Dockerfile                   Imagen de producción (Node → nginx)
docker-compose.yml           Levantar el frontend con Docker Compose
docker-compose.api.yml       Conectar con el Docker de Api-restful-favoritos
public/                      Recursos estáticos (favicon, imágenes, health.json)
scripts/healthcheck.mjs      Healthcheck del build o de un despliegue
src/
  app/
    app.ts|html|css          Componente raíz (encabezado + router-outlet)
    app.config.ts            Providers globales (router, HttpClient)
    app.routes.ts            Definición de rutas
    app.integration.spec.ts  Pruebas de integración
    models/                  Interfaces del dominio y respuestas de la API
    services/                FavoritoService (acceso a la API)
    favoritos-list/          Listado
    favorito-detail/         Detalle
    favorito-add/            Alta
    favorito-edit/           Edición
    favorito-form/           Formulario compartido: campos, validadores y errores de la API
    **/*.spec.ts             Pruebas unitarias junto a cada archivo
  environments/              Configuración por entorno
  testing/                   Utilidades compartidas para pruebas
```

## Scripts

| Comando                    | Descripción                                                                     |
| -------------------------- | ------------------------------------------------------------------------------- |
| `npm start`                | Servidor de desarrollo en `http://localhost:4200/` con recarga                  |
| `npm run build`            | Build de producción en `dist/favoritos`                                         |
| `npm run watch`            | Build de desarrollo en modo watch                                               |
| `npm run lint`             | ESLint sobre `src/**/*.ts` y `src/**/*.html`                                    |
| `npm test`                 | Todas las pruebas (modo watch en terminal interactiva)                          |
| `npm run test:unit`        | Solo pruebas unitarias                                                          |
| `npm run test:integration` | Solo pruebas de integración                                                     |
| `npm run test:ci`          | Todas las pruebas con cobertura y validación de umbrales                        |
| `npm run healthcheck`      | Sirve el build local y ejecuta el healthcheck (ver [Healthcheck](#healthcheck)) |

## Pruebas

Las pruebas usan el builder `@angular/build:unit-test` con Vitest y jsdom: no requieren navegador ni la API en ejecución.

### Unitarias (`*.spec.ts`)

Prueban cada pieza de forma aislada:

- **`FavoritoService`**: método HTTP, URL y cuerpo de cada petición, y propagación de errores, usando `HttpTestingController`.
- **Componentes**: renderizado, validaciones de formularios, navegación y manejo de errores. `FavoritoService` se sustituye por un doble (`createFavoritoServiceMock`) y `Router.navigate` se espía.

### Integración (`*.integration.spec.ts`)

Usan rutas, componentes y `FavoritoService` reales; solo se simula la red con `HttpTestingController`. Con `RouterTestingHarness` recorren los flujos completos: listar → ver detalle, agregar, editar, eliminar con confirmación, errores de la API y redirección de rutas desconocidas.

La integración con la API real se verifica con `node scripts/healthcheck.mjs <url> --with-api` (ver [Healthcheck](#healthcheck)).

### Cobertura

`npm run test:ci` genera el reporte en `coverage/` (resumen en consola + `lcov`) y falla si no se alcanzan los umbrales configurados en el target `test` de [`angular.json`](angular.json):

| Métrica    | Mínimo |
| ---------- | ------ |
| Statements | 90 %   |
| Branches   | 85 %   |
| Functions  | 90 %   |
| Lines      | 90 %   |

### Escribir nuevas pruebas

- Coloca la prueba unitaria junto al archivo que prueba, con sufijo `.spec.ts`.
- Nombra las pruebas de integración con sufijo `.integration.spec.ts` para que `test:unit` las excluya y `test:integration` las incluya.
- La app es **zoneless**: después de interactuar con el DOM o de responder una petición, espera con `await fixture.whenStable()` antes de hacer aserciones.
- Reutiliza los helpers de [`src/testing`](src/testing): `createFavoritoServiceMock()`, `fillInput()` y `submitForm()`.
- Los archivos de `src/testing` están excluidos del build de la app (`tsconfig.app.json`) e incluidos en `tsconfig.spec.json`.

## Integración continua

El workflow [`.github/workflows/ci.yml`](.github/workflows/ci.yml) se ejecuta en cada push y pull request a `master`, y también manualmente (`workflow_dispatch`).

| Job                    | Comando                                      | Depende de         |
| ---------------------- | -------------------------------------------- | ------------------ |
| Lint                   | `npm run lint`                               | —                  |
| Pruebas unitarias      | `npm run test:unit`                          | —                  |
| Pruebas de integración | `npm run test:integration`                   | —                  |
| Cobertura              | `npm run test:ci`                            | —                  |
| Build                  | `npm run build` + `npm run healthcheck`      | los cuatro previos |
| Imagen Docker          | `docker compose up -d --build` + healthcheck | los cuatro previos |

Los cuatro primeros jobs corren en paralelo; el build y la imagen Docker solo se ejecutan si todos pasan. El build verifica el resultado con el healthcheck; el job de Docker construye la imagen, espera a que el contenedor esté `healthy` y ejecuta el healthcheck contra él. El CI no levanta la API. Se publican como artefactos el reporte de cobertura (`coverage`) y la aplicación compilada (`dist`).

## Healthcheck

El frontend es una SPA estática: no tiene proceso de servidor propio, así que no aplican healthchecks de liveness/readiness de un backend. En su lugar hay dos mecanismos, que se complementan con los de la API.

### Endpoint `/health.json`

[`public/health.json`](public/health.json) se copia al build y queda disponible en `/health.json` en cualquier hosting estático:

```json
{ "status": "ok", "app": "favoritos" }
```

Úsalo como ruta de healthcheck en balanceadores de carga o monitores de uptime. La imagen Docker ya lo usa en su `HEALTHCHECK` (cada 30 s); consulta el estado con `docker compose ps`. Indica que el frontend está sirviendo archivos; **no** verifica la API.

### Script `scripts/healthcheck.mjs`

Script sin dependencias que comprueba que un despliegue funciona:

1. `GET /health.json` responde `200` con `status: "ok"`.
2. `GET /` responde `200` con el HTML de la app (`<app-root>`).
3. Todos los `.js` y `.css` referenciados por `index.html` responden `200` (detecta despliegues incompletos o con hashes desactualizados).
4. Con `--with-api`: `GET /api/favoritos` responde `200` con `{ favoritos: [...] }`, es decir, el proxy y la API funcionan.

Contra el build local (sirve `dist/favoritos/browser` en un puerto temporal):

```bash
npm run build
```

```bash
npm run healthcheck
```

Contra un despliegue:

```bash
node scripts/healthcheck.mjs https://tu-dominio.com
```

Contra el stack de Docker, incluida la API:

```bash
node scripts/healthcheck.mjs http://localhost:8090 --with-api
```

Sale con código `0` si todo pasa y `1` si algo falla, por lo que sirve como paso post-deploy. El tiempo de espera por petición es de 5 s; se puede cambiar con la variable `HEALTHCHECK_TIMEOUT_MS`. `--with-api` requiere una URL (no funciona con el build local, que no tiene API).

### Healthchecks de la API

La API expone sus propios endpoints (directamente en el puerto 5000, no a través de nginx):

| Endpoint                            | Qué indica                                         |
| ----------------------------------- | -------------------------------------------------- |
| `http://localhost:5000/health`       | Liveness: el proceso responde (`{"status":"ok"}`)  |
| `http://localhost:5000/health/ready` | Readiness: MongoDB disponible (`200` o `503`)      |

## Solución de problemas

| Síntoma | Causa y solución |
| ------- | ---------------- |
| `Bind for 0.0.0.0:8090 failed: port is already allocated` | Otro proceso usa el puerto. Usa otro: `WEB_PORT=9000 docker compose ...` (en PowerShell, `$env:WEB_PORT="9000"`). |
| `network api-restful-favoritos_default declared as external, but could not be found` | La API no está levantada o su carpeta tiene otro nombre. Levanta la API primero o define `API_NETWORK`. |
| El contenedor `favoritos` se reinicia y `docker compose logs` muestra `host not found in upstream` | nginx no puede resolver el host de `API_URL` al arrancar (la API no está corriendo). Levanta la API y recrea el frontend. |
| La app carga pero muestra "Error al cargar los favoritos." y `/api/*` responde `502` o `504` | nginx no alcanza la API: está detenida o se recreó y cambió de IP. Comprueba `curl http://localhost:5000/health/ready` y recrea el frontend con `--force-recreate`. |
| "Error al guardar el favorito." sin campos marcados | La API no está disponible o falló (`500`, `502`). Revisa `docker compose logs` y `curl http://localhost:5000/health/ready`. Si la API devuelve un mensaje, aparece junto al error. |
| Error de CORS en `npm start` | La API restringe `CORS_ORIGIN`; incluye `http://localhost:4200`. |
| `npm start` muestra "Error al cargar los favoritos." | La API no está en `http://localhost:5000`. Levántala (ver [Desarrollo local](#desarrollo-local)). |

## Mantenimiento de dependencias

Para revisar actualizaciones y vulnerabilidades:

```bash
npm outdated
```

```bash
npm audit
```

Restricciones de versión actuales:

- **TypeScript** debe permanecer en `>=6.0 <6.1`: es lo que admiten Angular 22 y `typescript-eslint`.
- **Vitest** debe permanecer en `4.x`: `@angular/build` 22 requiere `vitest ^4.0.8`. `@vitest/coverage-v8` debe tener la misma versión que `vitest`.
- Actualiza los paquetes `@angular/*` juntos a la misma versión (o usa `npx ng update`).

Después de actualizar, verifica con `npm run lint`, `npm run test:ci` y `npm run build`. Si cambias la imagen base de Node o nginx, reconstruye con `docker compose build --no-cache` y comprueba el healthcheck.
