import { expect, test } from '@playwright/test';

// Recorre la app real: navegador → nginx → API → MongoDB.
test('crea, consulta, edita y elimina un favorito', async ({ page }) => {
  const title = `E2E ${Date.now()}`;
  const editado = `${title} editado`;
  const item = (texto: string) => page.locator('.bookmark-item', { hasText: texto });

  await page.goto('/');

  // Alta
  await page.getByRole('link', { name: 'Agregar favorito' }).click();
  await expect(page).toHaveURL('/agregar-favorito');
  await page.getByLabel('Título:').fill(title);
  await page.getByLabel('Descripción (opcional):').fill('Creado por Playwright');
  await page.getByLabel('URL:').fill('https://playwright.dev');
  await page.getByRole('button', { name: 'Agregar favorito' }).click();

  await expect(page).toHaveURL('/');
  await expect(item(title)).toBeVisible();

  // Detalle, también al recargar la página (fallback de SPA en nginx)
  await item(title).getByRole('link', { name: 'Ver' }).click();
  await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible();
  await expect(page.getByText('Creado por Playwright')).toBeVisible();

  // Edición
  await page.goto('/');
  await item(title).getByRole('link', { name: 'Editar' }).click();
  await expect(page.getByLabel('Título:')).toHaveValue(title);
  await page.getByLabel('Título:').fill(editado);
  await page.getByRole('button', { name: 'Editar favorito' }).click();

  await expect(page).toHaveURL('/');
  await expect(item(editado)).toBeVisible();

  // Baja, con confirmación
  await item(editado).getByRole('button', { name: 'Eliminar' }).click();
  await item(editado).locator('.confirm-delete').getByRole('button', { name: 'Eliminar' }).click();
  await expect(item(editado)).toHaveCount(0);
});

test('una ruta de detalle inexistente vuelve al listado', async ({ page }) => {
  await page.goto('/favorito/000000000000000000000000');
  await expect(page).toHaveURL('/');
});

test('la API responde con las cabeceras de límite y de id de petición a través de nginx', async ({
  request,
}) => {
  const res = await request.get('/api/v1/bookmarks?limit=1');
  expect(res.status()).toBe(200);
  expect(res.headers()['ratelimit']).toBeTruthy();
  expect(res.headers()['x-request-id']).toMatch(/^[0-9a-f]{32}$/);
  const body = await res.json();
  expect(Array.isArray(body.bookmarks)).toBe(true);
  expect(typeof body.hasMore).toBe('boolean');
});
