import { TestBed } from '@angular/core/testing';
import { Location } from '@angular/common';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { routes } from './app.routes';
import { FavoritosList } from './favoritos-list/favoritos-list';
import { FavoritoDetail } from './favorito-detail/favorito-detail';
import { FavoritoAdd } from './favorito-add/favorito-add';
import { FavoritoEdit } from './favorito-edit/favorito-edit';
import { environment } from '../environments/environment';
import { Favorito } from './models/favorito';

/**
 * Pruebas de integración: rutas reales + componentes reales + FavoritoService real.
 * Solo se sustituye la capa de red con HttpTestingController.
 */
describe('Favoritos (integración)', () => {
  const api = environment.apiUrl;
  const favoritos: Favorito[] = [
    { id: '1', title: 'Angular', description: 'Framework web', url: 'https://angular.dev' },
    { id: '2', title: 'Vitest', description: 'Testing', url: 'https://vitest.dev' },
  ];

  let harness: RouterTestingHarness;
  let httpMock: HttpTestingController;
  let location: Location;

  const root = () => harness.routeNativeElement as HTMLElement;

  async function stable(): Promise<void> {
    await harness.fixture.whenStable();
  }

  async function type(selector: string, value: string): Promise<void> {
    const input = root().querySelector<HTMLInputElement | HTMLTextAreaElement>(selector)!;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    await stable();
  }

  async function submit(): Promise<void> {
    root().querySelector('form')!.dispatchEvent(new Event('submit'));
    await stable();
  }

  async function click(selector: string): Promise<void> {
    root().querySelector<HTMLElement>(selector)!.click();
    await stable();
  }

  function flushList(data: Favorito[]): void {
    const req = httpMock.expectOne(`${api}/favoritos`);
    expect(req.request.method).toBe('GET');
    req.flush({ favoritos: data });
  }

  beforeEach(async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    TestBed.configureTestingModule({
      providers: [provideRouter(routes), provideHttpClient(), provideHttpClientTesting()],
    });

    httpMock = TestBed.inject(HttpTestingController);
    location = TestBed.inject(Location);
    harness = await RouterTestingHarness.create();
  });

  afterEach(() => {
    httpMock.verify();
    vi.restoreAllMocks();
  });

  it('la ruta raíz muestra el listado obtenido de la API', async () => {
    await harness.navigateByUrl('/', FavoritosList);
    expect(root().querySelector('.loading')).not.toBeNull();

    flushList(favoritos);
    await stable();

    expect(root().querySelector('.loading')).toBeNull();
    const titulos = Array.from(root().querySelectorAll('.favorito-item h4')).map(
      (h) => h.textContent,
    );
    expect(titulos).toEqual(['Angular', 'Vitest']);
  });

  it('muestra un error cuando la API del listado falla', async () => {
    await harness.navigateByUrl('/', FavoritosList);

    httpMock
      .expectOne(`${api}/favoritos`)
      .flush('Error', { status: 500, statusText: 'Server Error' });
    await stable();

    expect(root().querySelector('.error')?.textContent).toContain('Error al cargar los favoritos.');
  });

  it('navega del listado al detalle mediante el enlace "Ver"', async () => {
    await harness.navigateByUrl('/', FavoritosList);
    flushList(favoritos);
    await stable();

    await click('.favorito-item .btn-ver');

    expect(location.path()).toBe('/favorito/1');
    httpMock.expectOne(`${api}/favorito/1`).flush({ favorito: favoritos[0] });
    await stable();

    expect(root().querySelector('.favorito-box h1')?.textContent).toBe('Angular');
    expect(root().querySelector('.description')?.textContent).toBe('Framework web');
  });

  it('el detalle de un favorito inexistente redirige al listado', async () => {
    await harness.navigateByUrl('/favorito/99', FavoritoDetail);

    httpMock
      .expectOne(`${api}/favorito/99`)
      .flush('No encontrado', { status: 404, statusText: 'Not Found' });
    await stable();

    expect(location.path()).toBe('');
    flushList([]);
    await stable();
    expect(root().querySelector('.empty')).not.toBeNull();
  });

  it('agrega un favorito y vuelve al listado actualizado', async () => {
    const nuevo: Favorito = { title: 'MDN', description: 'Docs', url: 'https://developer.mozilla.org' };

    await harness.navigateByUrl('/agregar-favorito', FavoritoAdd);
    await type('#title', nuevo.title);
    await type('#description', nuevo.description);
    await type('#url', nuevo.url);
    await submit();

    const post = httpMock.expectOne(`${api}/favorito`);
    expect(post.request.method).toBe('POST');
    expect(post.request.body).toEqual(nuevo);
    post.flush({ favorito: { ...nuevo, id: '3' } });
    await stable();

    expect(location.path()).toBe('');
    flushList([...favoritos, { ...nuevo, id: '3' }]);
    await stable();
    expect(root().querySelectorAll('.favorito-item').length).toBe(3);
  });

  it('no llama a la API al enviar el formulario de alta vacío', async () => {
    await harness.navigateByUrl('/agregar-favorito', FavoritoAdd);
    await submit();

    httpMock.expectNone(`${api}/favorito`);
    expect(location.path()).toBe('/agregar-favorito');
    const errores = Array.from(root().querySelectorAll('span.error')).map((e) => e.textContent);
    expect(errores).toEqual(['¡El título es obligatorio!', '¡La URL es obligatoria!']);
  });

  it('no llama a la API si la URL no es válida', async () => {
    await harness.navigateByUrl('/agregar-favorito', FavoritoAdd);
    await type('#title', 'Docker');
    await type('#url', 'docs.docker.com');
    await submit();

    httpMock.expectNone(`${api}/favorito`);
    expect(root().querySelector('span.error')?.textContent).toBe(
      '¡La URL debe empezar con http:// o https://!',
    );
  });

  it('muestra los errores de validación que devuelve la API en sus campos', async () => {
    await harness.navigateByUrl('/agregar-favorito', FavoritoAdd);
    await type('#title', 'T');
    await type('#url', 'https://u.com');
    await submit();

    const post = httpMock.expectOne(`${api}/favorito`);
    expect(post.request.body).toEqual({ title: 'T', description: '', url: 'https://u.com' });
    post.flush(
      {
        message: 'Datos inválidos',
        errors: [{ path: 'url', message: 'La URL no es válida' }],
      },
      { status: 400, statusText: 'Bad Request' },
    );
    await stable();

    expect(location.path()).toBe('/agregar-favorito');
    expect(root().querySelector('p.error')?.textContent).toBe(
      'Error al guardar el favorito. Revisa los campos marcados.',
    );
    expect(root().querySelector('span.error')?.textContent).toBe('La URL no es válida');
  });

  it('mantiene al usuario en el formulario si la API de alta falla', async () => {
    await harness.navigateByUrl('/agregar-favorito', FavoritoAdd);
    await type('#title', 'T');
    await type('#description', 'D');
    await type('#url', 'https://u.com');
    await submit();

    httpMock
      .expectOne(`${api}/favorito`)
      .flush('Error', { status: 500, statusText: 'Server Error' });
    await stable();

    expect(location.path()).toBe('/agregar-favorito');
    expect(root().querySelector('p.error')?.textContent).toBe('Error al guardar el favorito.');
  });

  it('edita un favorito existente y vuelve al listado', async () => {
    await harness.navigateByUrl('/editar-favorito/1', FavoritoEdit);
    httpMock.expectOne(`${api}/favorito/1`).flush({ favorito: favoritos[0] });
    await stable();

    expect(root().querySelector<HTMLInputElement>('#title')?.value).toBe('Angular');

    await type('#title', 'Angular 22');
    await submit();

    const put = httpMock.expectOne(`${api}/favorito/1`);
    expect(put.request.method).toBe('PUT');
    expect(put.request.body).toEqual({
      title: 'Angular 22',
      description: 'Framework web',
      url: 'https://angular.dev',
    });
    put.flush({ favorito: { ...favoritos[0], title: 'Angular 22' } });
    await stable();

    expect(location.path()).toBe('');
    flushList([{ ...favoritos[0], title: 'Angular 22' }, favoritos[1]]);
    await stable();
    expect(root().querySelector('.favorito-item h4')?.textContent).toBe('Angular 22');
  });

  it('elimina un favorito tras confirmar y recarga el listado', async () => {
    await harness.navigateByUrl('/', FavoritosList);
    flushList(favoritos);
    await stable();

    await click('.favorito-item .btn-eliminar');
    await click('.seguro .btn-eliminar');

    const del = httpMock.expectOne(`${api}/favorito/1`);
    expect(del.request.method).toBe('DELETE');
    del.flush({ message: 'Favorito eliminado' });
    await stable();

    flushList([favoritos[1]]);
    await stable();
    const items = root().querySelectorAll('.favorito-item');
    expect(items.length).toBe(1);
    expect(items[0].querySelector('h4')?.textContent).toBe('Vitest');
  });

  it('redirige las rutas desconocidas al listado', async () => {
    await harness.navigateByUrl('/ruta-que-no-existe');

    expect(location.path()).toBe('');
    expect(TestBed.inject(Router).url).toBe('/');
    flushList([]);
  });
});
