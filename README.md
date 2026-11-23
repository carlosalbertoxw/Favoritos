# Favoritos

[![CI](https://github.com/carlosalbertoxw/Favoritos/actions/workflows/ci.yml/badge.svg)](https://github.com/carlosalbertoxw/Favoritos/actions/workflows/ci.yml)

Frontend en **Angular 22** para guardar páginas favoritas (marcadores): listar, ver, agregar, editar y eliminar. Consume la API v1 de [Api-restful-favoritos](https://github.com/carlosalbertoxw/Api-restful-favoritos) (versión 4 o superior), en `/api/v1/bookmarks`.

Es un ejercicio de ejemplo: ni la app ni la API tienen autenticación, así que no debe publicarse tal cual en internet. Por eso, con Docker, todo se publica solo en `127.0.0.1`.

**Convención de nombres:** el código está en inglés (`BookmarkService`, `BookmarkList`); los textos de la interfaz y las rutas de la app (`/agregar-favorito`), en español.

## Ejecución

Se asume que ambos repositorios están clonados en la misma carpeta (`…/Api-restful-favoritos` y `…/Favoritos`).

### Con Docker

Requiere Docker con Compose 2.20 o superior. Un solo comando levanta la app, la API y MongoDB, en orden y en la misma red:

```bash
docker compose -f docker-compose.yml -f docker-compose.api.yml up -d --build --wait
```

Abre `http://localhost:8090`. Para comprobar también el proxy hacia la API:

```bash
node scripts/healthcheck.mjs http://localhost:8090 --with-api
```

Para detenerlo:

```bash
docker compose -f docker-compose.yml -f docker-compose.api.yml down
```

[`docker-compose.api.yml`](docker-compose.api.yml) incluye el `docker-compose.yml` de la API, así que sus datos son los mismos que si la levantas desde su repositorio. Al reiniciar la API (`docker compose -f docker-compose.yml -f docker-compose.api.yml restart api`), Compose reinicia también nginx. Si recreas solo la API con `up … api`, reinicia después `web` para que nginx resuelva su nueva IP.

Para usar una API que corre con Node en tu máquina, omite `docker-compose.api.yml`: nginx reenviará `/api/` a `host.docker.internal:5000`, donde la API debe escuchar en todas las interfaces (es lo que hace `npm run dev` en el repositorio de la API).

### Con Node local

Requiere Node.js `^24.15.0` o `>=26` y la API en `http://localhost:5000`.

```bash
npm ci
```

```bash
npm start
```

Abre `http://localhost:4200`. `ng serve` reenvía `/api` a `http://localhost:5000` ([`proxy.conf.json`](proxy.conf.json)), así que la app usa la API desde su mismo origen y no necesita CORS, igual que con nginx.

## Variables de Docker

Se leen del entorno o de un archivo `.env` (copia [`.env.example`](.env.example)).

| Variable   | Descripción                                                                                  | Por defecto                        |
| ---------- | -------------------------------------------------------------------------------------------- | ---------------------------------- |
| `API_URL`  | Backend al que nginx reenvía `/api/*`, sin barra final (con `docker-compose.api.yml` se ignora) | `http://host.docker.internal:5000` |
| `WEB_PORT` | Puerto de `127.0.0.1` donde se publica la app (el contenedor escucha en `8080`)              | `8090`                             |

## Rutas

| Ruta                   | Componente       | Descripción                                            |
| ---------------------- | ---------------- | ------------------------------------------------------ |
| `/`                    | `BookmarkList`   | Listado de 20 en 20; permite eliminar con confirmación |
| `/favorito/:id`        | `BookmarkDetail` | Detalle de un favorito                                 |
| `/agregar-favorito`    | `BookmarkEditor` | Formulario de alta                                     |
| `/editar-favorito/:id` | `BookmarkEditor` | Formulario de edición                                  |

El detalle y la edición cargan el favorito con `rxResource`. Si no existe (404), se redirige a `/`; si la API falla por otro motivo, se muestra un mensaje con un botón para reintentar. Mientras carga, el formulario de edición está deshabilitado. El botón "Cargar más" depende de `hasMore`, que devuelve la API. El contrato de la API está en su Swagger UI: `http://localhost:5000/docs`.

El formulario aplica las mismas reglas que la API ([validadores](src/app/bookmark-form/bookmark-form.validators.ts)) y muestra bajo cada campo los errores de validación que ella devuelva.

## Scripts

```bash
npm run lint              # ESLint
npm test                  # pruebas en modo observación
npm run test:unit         # pruebas unitarias
npm run test:integration  # rutas, componentes y servicio reales, con la red simulada
npm run test:ci           # todas, con umbral mínimo de cobertura
npm run build             # build de producción
npm run healthcheck       # sirve y verifica el build local
npm run e2e               # pruebas de extremo a extremo con Playwright (ver abajo)
```

Para verificar un despliegue, indica su URL. `--with-api` comprueba además el proxy hacia la API y `--with-headers` las cabeceras de seguridad de nginx. Cada petición espera 5 s; se puede cambiar con `HEALTHCHECK_TIMEOUT_MS`.

```bash
node scripts/healthcheck.mjs http://localhost:8090 --with-api --with-headers
```

### Pruebas de extremo a extremo

Las pruebas de [`e2e/`](e2e) usan un navegador real contra la app, la API y MongoDB: crean, consultan, editan y eliminan un favorito. Necesitan todo levantado con Docker (ver arriba) y, la primera vez, el navegador de Playwright:

```bash
npx playwright install chromium
```

```bash
npm run e2e
```

Usan `http://localhost:8090`; para otra URL, define `E2E_BASE_URL`.

### CI

El workflow de [CI](.github/workflows/ci.yml) ejecuta el lint, las pruebas, el build, una verificación de la imagen Docker (cabeceras de seguridad, que no corra como root y escaneo con Trivy), las pruebas e2e contra la API y `npm audit`. Las e2e usan la rama de Api-restful-favoritos con el mismo nombre si existe (para cambios coordinados) o `master`.

Dependabot propone las actualizaciones cada semana, agrupadas (Angular, Vitest y el resto de herramientas de desarrollo), y los parches y versiones menores se integran solos cuando el CI pasa. Las versiones mayores quedan para revisión manual.

La rama `master` solo acepta cambios por PR con el CI en verde. GitHub ejecuta además CodeQL y el escaneo de secretos, que bloquea los push con credenciales.

## Cabeceras de seguridad

nginx envía las cabeceras de [`security-headers.conf`](docker/nginx/security-headers.conf) en todas las respuestas. La CSP no permite scripts inline, por lo que el build de producción desactiva `inlineCritical` en [`angular.json`](angular.json). HSTS no se envía porque el contenedor sirve HTTP: agrégalo en el proxy que termine TLS.

Para variar el `Cache-Control` usa el `map` de [`default.conf.template`](docker/nginx/default.conf.template): un `add_header` dentro de un `location` anularía las cabeceras de seguridad.

nginx reenvía a la API su `$request_id` en la cabecera `X-Request-Id`, así que la misma petición se puede seguir en los logs de los dos.

## Solución de problemas

| Síntoma | Causa y solución |
| ------- | ---------------- |
| `port is already allocated` | Otro proceso usa el puerto; cambia `WEB_PORT` (o detén la API si la levantaste aparte desde su repositorio). |
| `include` no se reconoce o no encuentra `../Api-restful-favoritos` | Actualiza Docker Compose a 2.20 o superior y clona los dos repositorios en la misma carpeta. |
| `container name "/favoritos-api" is already in use` | La API ya corre desde su propio repositorio; detenla allí (`docker compose down`) y vuelve a levantar todo desde aquí. |
| "Error al cargar los favoritos." | La API no responde; comprueba `http://localhost:5000/health/ready`. Si la recreaste por separado, reinicia `web`. |

## Dependencias

- **TypeScript** debe permanecer en `>=6.0 <6.1`, lo que admiten Angular 22 y `typescript-eslint`.
- Actualiza juntos los paquetes `@angular/*` (o usa `npx ng update`), porque exigen versiones exactas entre sí. Lo mismo vale para `vitest` y `@vitest/coverage-v8`.

## Licencia

[MIT](LICENSE) © Carlos Alberto.
