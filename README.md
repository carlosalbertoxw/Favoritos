# Favoritos

[![CI](https://github.com/carlosalbertoxw/Favoritos/actions/workflows/ci.yml/badge.svg)](https://github.com/carlosalbertoxw/Favoritos/actions/workflows/ci.yml)

Frontend en **Angular 22** para guardar páginas favoritas (marcadores): listar, ver, agregar, editar y eliminar. Consume [Api-restful-favoritos](https://github.com/carlosalbertoxw/Api-restful-favoritos) (versión 3 o superior).

Es un ejercicio de ejemplo: ni la app ni la API tienen autenticación, así que no debe publicarse tal cual en internet.

## Ejecución

Se asume que ambos repositorios están clonados en la misma carpeta (`ProyectosDesarrollo/Api-restful-favoritos` y `ProyectosDesarrollo/Favoritos`).

### Con Docker

Solo requiere Docker con Compose v2. La API debe levantarse primero, porque nginx resuelve su nombre al arrancar:

```bash
cd ../Api-restful-favoritos && docker compose up -d --build --wait
```

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

Si recreas la API, recrea también el frontend con `--force-recreate`, porque cambia su IP. Para usar un backend fuera de Docker, omite `docker-compose.api.yml`: nginx reenviará `/api/` al puerto 5000 de tu máquina.

### Con Node local

Requiere Node.js `^24.15.0` o `>=26` y la API en `http://localhost:5000`.

```bash
npm ci
```

```bash
npm start
```

Abre `http://localhost:4200`. Si la API restringe `CORS_ORIGIN`, incluye ese origen.

## Variables de Docker

Se leen del entorno o de un archivo `.env` (copia [`.env.example`](.env.example)).

| Variable      | Descripción                                                  | Por defecto                        |
| ------------- | ------------------------------------------------------------ | ---------------------------------- |
| `API_URL`     | Backend al que nginx reenvía `/api/*`, sin barra final       | `http://host.docker.internal:5000` |
| `WEB_PORT`    | Puerto de tu máquina donde se publica la app                 | `8090`                             |
| `API_NETWORK` | Red de Docker de la API; solo con `docker-compose.api.yml`   | `api-restful-favoritos_default`    |

## Rutas

| Ruta                   | Componente       | Descripción                                       |
| ---------------------- | ---------------- | ------------------------------------------------- |
| `/`                    | `FavoritosList`  | Listado de 20 en 20; permite eliminar con confirmación |
| `/favorito/:id`        | `FavoritoDetail` | Detalle de un favorito                            |
| `/agregar-favorito`    | `FavoritoEditor` | Formulario de alta                                |
| `/editar-favorito/:id` | `FavoritoEditor` | Formulario de edición                             |

Si el detalle o la edición no encuentran el favorito, o la API falla, se redirige a `/`. El contrato de la API está en su Swagger UI: `http://localhost:5000/docs`.

El formulario aplica las mismas reglas que la API ([validadores](src/app/favorito-form/favorito-form.validators.ts)) y muestra bajo cada campo los errores de validación que ella devuelva.

## Scripts

```bash
npm run lint              # ESLint
npm run test:unit         # pruebas unitarias
npm run test:integration  # rutas, componentes y servicio reales, con la red simulada
npm run test:ci           # todas, con umbral mínimo de cobertura
npm run build             # build de producción
npm run healthcheck       # verifica el build local; acepta una URL y --with-api o --with-headers
```

El workflow de [CI](.github/workflows/ci.yml) ejecuta el lint, las pruebas, el build, una verificación de la imagen Docker (incluidas las cabeceras de seguridad y que no corra como root) y `npm audit`. Dependabot propone las actualizaciones cada semana.

## Cabeceras de seguridad

nginx envía las cabeceras de [`security-headers.conf`](docker/nginx/security-headers.conf) en todas las respuestas. La CSP no permite scripts inline, por lo que el build de producción desactiva `inlineCritical` en [`angular.json`](angular.json). HSTS no se envía porque el contenedor sirve HTTP: agrégalo en el proxy que termine TLS.

Para variar el `Cache-Control` usa el `map` de [`default.conf.template`](docker/nginx/default.conf.template): un `add_header` dentro de un `location` anularía las cabeceras de seguridad.

## Solución de problemas

| Síntoma | Causa y solución |
| ------- | ---------------- |
| `port is already allocated` | Otro proceso usa el puerto; cambia `WEB_PORT`. |
| `network api-restful-favoritos_default ... could not be found` | La API no está levantada o su carpeta tiene otro nombre; levántala o define `API_NETWORK`. |
| El contenedor se reinicia con `host not found in upstream` | nginx no resuelve el host de `API_URL`; levanta la API y recrea el frontend. |
| "Error al cargar los favoritos." | La API no responde o se recreó; comprueba `http://localhost:5000/health/ready` y recrea el frontend con `--force-recreate`. |

## Dependencias

- **TypeScript** debe permanecer en `>=6.0 <6.1`, lo que admiten Angular 22 y `typescript-eslint`.
- Actualiza juntos los paquetes `@angular/*` (o usa `npx ng update`), porque exigen versiones exactas entre sí. Lo mismo vale para `vitest` y `@vitest/coverage-v8`.
- `overrides` en `package.json` fuerza `minimatch` 11 porque ESLint y `typescript-eslint` aún dependen de una versión con una vulnerabilidad conocida ([GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249)). Quítalo cuando la actualicen.

## Licencia

[MIT](LICENSE) © Carlos Alberto.
