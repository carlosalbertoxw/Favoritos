#!/usr/bin/env node
/**
 * Healthcheck de la aplicación desplegada.
 *
 * Uso:
 *   node scripts/healthcheck.mjs <url>             Verifica un despliegue (p. ej. https://mi-dominio.com)
 *   node scripts/healthcheck.mjs                   Sirve dist/favoritos/browser en un puerto local y lo verifica
 *   node scripts/healthcheck.mjs <url> --with-api  Además verifica la API a través de /api
 *
 * Comprobaciones:
 *   1. GET /health.json responde 200 con { "status": "ok" }
 *   2. GET / responde 200 con HTML que contiene <app-root>
 *   3. Los scripts y hojas de estilo referenciados por index.html responden 200
 *   4. (--with-api) GET /api/favoritos responde 200 con { favoritos: [...] }
 *
 * Sale con código 0 si todo pasa y 1 si algo falla.
 */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';

const TIMEOUT_MS = Number(process.env.HEALTHCHECK_TIMEOUT_MS ?? 5000);
const DIST_DIR = resolve('dist/favoritos/browser');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.ico': 'image/x-icon',
  '.png': 'image/png',
  '.gif': 'image/gif',
};

async function get(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  return { status: res.status, body: await res.text() };
}

async function check(name, fn) {
  try {
    await fn();
    console.log(`✔ ${name}`);
    return true;
  } catch (err) {
    console.error(`✘ ${name}: ${err.message}`);
    return false;
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

/** Servidor estático mínimo con fallback a index.html, como un hosting de SPA. */
async function serveDist() {
  const server = createServer(async (req, res) => {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const file = normalize(join(DIST_DIR, pathname));
    const target = file.startsWith(DIST_DIR) && extname(file) ? file : join(DIST_DIR, 'index.html');
    try {
      const content = await readFile(target);
      res.writeHead(200, { 'Content-Type': MIME_TYPES[extname(target)] ?? 'application/octet-stream' });
      res.end(content);
    } catch {
      res.writeHead(404).end();
    }
  });
  await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
  return { server, url: `http://127.0.0.1:${server.address().port}` };
}

async function main() {
  const args = process.argv.slice(2);
  const withApi = args.includes('--with-api');
  let baseUrl = args.find((arg) => !arg.startsWith('--'));
  let local;

  if (withApi && !baseUrl) {
    console.error('--with-api requiere la URL de un despliegue con la API disponible en /api.');
    process.exit(1);
  }

  if (!baseUrl) {
    try {
      await readFile(join(DIST_DIR, 'index.html'));
    } catch {
      console.error(`No existe ${DIST_DIR}/index.html. Ejecuta "npm run build" primero.`);
      process.exit(1);
    }
    local = await serveDist();
    baseUrl = local.url;
  }
  baseUrl = baseUrl.replace(/\/+$/, '');
  console.log(`Healthcheck de ${baseUrl}`);

  let html = '';
  const results = [
    await check('GET /health.json', async () => {
      const { status, body } = await get(`${baseUrl}/health.json`);
      assert(status === 200, `status ${status}`);
      assert(JSON.parse(body).status === 'ok', `respuesta inesperada: ${body}`);
    }),
    await check('GET /', async () => {
      const { status, body } = await get(`${baseUrl}/`);
      assert(status === 200, `status ${status}`);
      assert(body.includes('<app-root'), 'index.html no contiene <app-root>');
      html = body;
    }),
    await check('Recursos de index.html', async () => {
      const assets = [...html.matchAll(/(?:src|href)="([^"]+\.(?:js|css))"/g)].map((m) => m[1]);
      assert(assets.length > 0, 'no se encontraron scripts ni estilos');
      for (const asset of assets) {
        const { status } = await get(new URL(asset, `${baseUrl}/`).href);
        assert(status === 200, `${asset} respondió ${status}`);
      }
    }),
  ];

  if (withApi) {
    results.push(
      await check('GET /api/favoritos', async () => {
        const { status, body } = await get(`${baseUrl}/api/favoritos`);
        assert(status === 200, `status ${status}`);
        assert(Array.isArray(JSON.parse(body).favoritos), `respuesta inesperada: ${body.slice(0, 200)}`);
      }),
    );
  }

  if (local) {
    local.server.closeAllConnections();
    await new Promise((ok) => local.server.close(ok));
  }
  const ok = results.every(Boolean);
  console.log(ok ? 'Healthcheck OK' : 'Healthcheck FALLÓ');
  process.exitCode = ok ? 0 : 1;
}

main();
