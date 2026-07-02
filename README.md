# Favoritos

Frontend en **Angular 22** para guardar páginas favoritas (marcadores), consumiendo una API RESTful de favoritos.

Aplicación CRUD: listar, ver, agregar, editar y eliminar marcadores.

## Stack

- **Angular 22** (standalone components, zoneless, signals, control-flow `@if`/`@for`)
- **TypeScript 6**
- **RxJS 7** + `HttpClient` (`provideHttpClient`)
- **Vitest** para pruebas unitarias
- Formularios reactivos tipados

## Requisitos

- Node.js 20+ (probado con Node 24)
- npm 10+

## Instalación

```bash
npm install
```

## Configuración de la API

La URL de la API se define en los archivos de entorno:

- Desarrollo: [`src/environments/environment.ts`](src/environments/environment.ts) → `apiUrl: 'http://localhost:5000/api'`
- Producción: [`src/environments/environment.prod.ts`](src/environments/environment.prod.ts) → `apiUrl: '/api'`

Ajusta `apiUrl` según dónde esté desplegado tu backend. El contrato esperado es:

| Método | Ruta                  | Respuesta                 |
| ------ | --------------------- | ------------------------- |
| GET    | `/favoritos`          | `{ favoritos: [...] }`    |
| GET    | `/favorito/:id`       | `{ favorito: {...} }`     |
| POST   | `/favorito`           | `{ favorito: {...} }`     |
| PUT    | `/favorito/:id`       | `{ favorito: {...} }`     |
| DELETE | `/favorito/:id`       | `{ message: "..." }`      |

## Desarrollo

```bash
npm start
```

Navega a `http://localhost:4200/`. La app recarga al cambiar los archivos fuente.

## Build

```bash
npm run build
```

Los artefactos se generan en `dist/`. Por defecto usa la configuración de producción.

## Pruebas

```bash
npm test
```

Ejecuta las pruebas unitarias con Vitest.
