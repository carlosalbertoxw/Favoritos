import { TestBed } from '@angular/core/testing';
import { Location } from '@angular/common';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  TestRequest,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { Router, provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { routes } from './app.routes';
import { BookmarkList } from './bookmark-list/bookmark-list';

import { BookmarkEditor } from './bookmark-editor/bookmark-editor';
import { BOOKMARKS_API } from './services/bookmark.service';
import { Bookmark, NewBookmark } from './models/bookmark';

/**
 * Pruebas de integración: rutas reales + componentes reales + BookmarkService real.
 * Solo se sustituye la capa de red con HttpTestingController.
 */
describe('Favoritos (integración)', () => {
  const api = BOOKMARKS_API;
  const listUrl = `${api}?skip=0&limit=20`;
  const bookmarks: Bookmark[] = [
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

  /** Espera a que la app haga la petición (sin esperar la estabilidad, que depende de ella). */
  async function request(url: string): Promise<TestRequest> {
    let req: TestRequest | undefined;
    await vi.waitFor(() => {
      // Ejecuta la detección de cambios para que el resource lance su petición.
      TestBed.tick();
      req = httpMock.expectOne(url);
    });
    return req!;
  }

  /** Navega a una página cuya carga queda pendiente hasta responder la petición. */
  async function navigateAndRespond(
    url: string,
    apiUrl: string,
    ...response: Parameters<TestRequest['flush']>
  ): Promise<void> {
    const navigation = harness.navigateByUrl(url);
    (await request(apiUrl)).flush(...response);
    await navigation;
    await stable();
  }

  function flushList(data: Bookmark[], hasMore = false): void {
    const req = httpMock.expectOne(listUrl);
    expect(req.request.method).toBe('GET');
    req.flush({ bookmarks: data, hasMore });
  }

  beforeEach(async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes, withComponentInputBinding()),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
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
    await harness.navigateByUrl('/', BookmarkList);
    expect(root().querySelector('.loading')).not.toBeNull();

    flushList(bookmarks);
    await stable();

    expect(root().querySelector('.loading')).toBeNull();
    const titulos = Array.from(root().querySelectorAll('.bookmark-item h4')).map(
      (h) => h.textContent,
    );
    expect(titulos).toEqual(['Angular', 'Vitest']);
  });

  it('muestra un error cuando la API del listado falla', async () => {
    await harness.navigateByUrl('/', BookmarkList);

    httpMock
      .expectOne(listUrl)
      .flush('Error', { status: 500, statusText: 'Server Error' });
    await stable();

    expect(root().querySelector('.error')?.textContent).toContain('Error al cargar los favoritos.');
  });

  it('navega del listado al detalle mediante el enlace "Ver"', async () => {
    await harness.navigateByUrl('/', BookmarkList);
    flushList(bookmarks);
    await stable();

    root().querySelector<HTMLElement>('.bookmark-item .btn-view')!.click();
    (await request(`${api}/1`)).flush({ bookmark: bookmarks[0] });
    await stable();

    expect(location.path()).toBe('/favorito/1');

    expect(root().querySelector('.bookmark-box h1')?.textContent).toBe('Angular');
    expect(root().querySelector('.description')?.textContent).toBe('Framework web');
  });

  it('el detalle de un favorito inexistente redirige al listado', async () => {
    await navigateAndRespond('/favorito/99', `${api}/99`, 'No encontrado', {
      status: 404,
      statusText: 'Not Found',
    });

    expect(location.path()).toBe('');
    flushList([]);
    await stable();
    expect(root().querySelector('.empty')).not.toBeNull();
  });

  it('agrega un favorito y vuelve al listado actualizado', async () => {
    const nuevo: NewBookmark = { title: 'MDN', description: 'Docs', url: 'https://developer.mozilla.org' };

    await harness.navigateByUrl('/agregar-favorito', BookmarkEditor);
    await type('#title', nuevo.title);
    await type('#description', nuevo.description);
    await type('#url', nuevo.url);
    await submit();

    const post = httpMock.expectOne(api);
    expect(post.request.method).toBe('POST');
    expect(post.request.body).toEqual(nuevo);
    post.flush({ bookmark: { ...nuevo, id: '3' } });
    await stable();

    expect(location.path()).toBe('');
    flushList([...bookmarks, { ...nuevo, id: '3' }]);
    await stable();
    expect(root().querySelectorAll('.bookmark-item').length).toBe(3);
  });

  it('no llama a la API al enviar el formulario de alta vacío', async () => {
    await harness.navigateByUrl('/agregar-favorito', BookmarkEditor);
    await submit();

    httpMock.expectNone(api);
    expect(location.path()).toBe('/agregar-favorito');
    const errores = Array.from(root().querySelectorAll('span.error')).map((e) => e.textContent);
    expect(errores).toEqual(['¡El título es obligatorio!', '¡La URL es obligatoria!']);
  });

  it('no llama a la API si la URL no es válida', async () => {
    await harness.navigateByUrl('/agregar-favorito', BookmarkEditor);
    await type('#title', 'Docker');
    await type('#url', 'docs.docker.com');
    await submit();

    httpMock.expectNone(api);
    expect(root().querySelector('span.error')?.textContent).toBe(
      '¡La URL debe empezar con http:// o https://!',
    );
  });

  it('muestra los errores de validación que devuelve la API en sus campos', async () => {
    await harness.navigateByUrl('/agregar-favorito', BookmarkEditor);
    await type('#title', 'T');
    await type('#url', 'https://u.com');
    await submit();

    const post = httpMock.expectOne(api);
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
    await harness.navigateByUrl('/agregar-favorito', BookmarkEditor);
    await type('#title', 'T');
    await type('#description', 'D');
    await type('#url', 'https://u.com');
    await submit();

    httpMock
      .expectOne(api)
      .flush('Error', { status: 500, statusText: 'Server Error' });
    await stable();

    expect(location.path()).toBe('/agregar-favorito');
    expect(root().querySelector('p.error')?.textContent).toBe('Error al guardar el favorito.');
  });

  it('edita un favorito existente y vuelve al listado', async () => {
    await navigateAndRespond('/editar-favorito/1', `${api}/1`, { bookmark: bookmarks[0] });

    expect(root().querySelector<HTMLInputElement>('#title')?.value).toBe('Angular');

    await type('#title', 'Angular 22');
    await submit();

    const patch = httpMock.expectOne(`${api}/1`);
    expect(patch.request.method).toBe('PATCH');
    expect(patch.request.body).toEqual({
      title: 'Angular 22',
      description: 'Framework web',
      url: 'https://angular.dev',
    });
    patch.flush({ bookmark: { ...bookmarks[0], title: 'Angular 22' } });
    await stable();

    expect(location.path()).toBe('');
    flushList([{ ...bookmarks[0], title: 'Angular 22' }, bookmarks[1]]);
    await stable();
    expect(root().querySelector('.bookmark-item h4')?.textContent).toBe('Angular 22');
  });

  it('elimina un favorito tras confirmar y lo quita del listado', async () => {
    await harness.navigateByUrl('/', BookmarkList);
    flushList(bookmarks);
    await stable();

    await click('.bookmark-item .btn-delete');
    await click('.confirm-delete .btn-delete');

    const del = httpMock.expectOne(`${api}/1`);
    expect(del.request.method).toBe('DELETE');
    del.flush(null, { status: 204, statusText: 'No Content' });
    await stable();

    const items = root().querySelectorAll('.bookmark-item');
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
