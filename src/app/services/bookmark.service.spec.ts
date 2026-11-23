import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { BOOKMARKS_API, BookmarkService, isNotFound } from './bookmark.service';
import { Bookmark, NewBookmark } from '../models/bookmark';

describe('BookmarkService', () => {
  const bookmark: Bookmark = {
    id: '1',
    title: 'Angular',
    description: 'Framework web',
    url: 'https://angular.dev',
  };
  const datos: NewBookmark = { title: 'Nuevo', description: 'Desc', url: 'https://x.com' };

  let service: BookmarkService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(BookmarkService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('usa la API v1 desde el mismo origen', () => {
    expect(BOOKMARKS_API).toBe('/api/v1/bookmarks');
  });

  it('list hace GET a /api/v1/bookmarks con la paginación', () => {
    let result: unknown;
    service.list(40, 20).subscribe((res) => (result = res));

    const req = httpMock.expectOne(`${BOOKMARKS_API}?skip=40&limit=20`);
    expect(req.request.method).toBe('GET');
    req.flush({ bookmarks: [bookmark], hasMore: true });

    expect(result).toEqual({ bookmarks: [bookmark], hasMore: true });
  });

  it('get hace GET a /api/v1/bookmarks/:id', () => {
    let result: unknown;
    service.get('1').subscribe((res) => (result = res));

    const req = httpMock.expectOne(`${BOOKMARKS_API}/1`);
    expect(req.request.method).toBe('GET');
    req.flush({ bookmark });

    expect(result).toEqual({ bookmark });
  });

  it('create hace POST a /api/v1/bookmarks con el cuerpo', () => {
    service.create(datos).subscribe();

    const req = httpMock.expectOne(BOOKMARKS_API);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(datos);
    req.flush({ bookmark: { ...datos, id: '2' } });
  });

  it('update hace PATCH a /api/v1/bookmarks/:id con el cuerpo', () => {
    service.update('1', datos).subscribe();

    const req = httpMock.expectOne(`${BOOKMARKS_API}/1`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual(datos);
    req.flush({ bookmark });
  });

  it('delete hace DELETE a /api/v1/bookmarks/:id y acepta la respuesta 204 sin cuerpo', () => {
    let completado = false;
    service.delete('1').subscribe({ complete: () => (completado = true) });

    const req = httpMock.expectOne(`${BOOKMARKS_API}/1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null, { status: 204, statusText: 'No Content' });

    expect(completado).toBe(true);
  });

  it('codifica el id para que no altere la ruta de la API', () => {
    const id = '../bookmarks?x=1#y';
    const encoded = encodeURIComponent(id);

    service.get(id).subscribe();
    service.update(id, datos).subscribe();
    service.delete(id).subscribe();

    const reqs = httpMock.match(`${BOOKMARKS_API}/${encoded}`);
    expect(reqs.map((req) => req.request.method)).toEqual(['GET', 'PATCH', 'DELETE']);
    reqs.forEach((req) => req.flush({}));
  });

  it('propaga los errores HTTP', () => {
    let status: number | undefined;
    service.list(0, 20).subscribe({ error: (err) => (status = err.status) });

    httpMock
      .expectOne(`${BOOKMARKS_API}?skip=0&limit=20`)
      .flush('Error', { status: 500, statusText: 'Server Error' });

    expect(status).toBe(500);
  });
});

describe('isNotFound', () => {
  const notFound = new HttpErrorResponse({ status: 404 });

  it('reconoce un 404, directo o envuelto por un resource en cause', () => {
    expect(isNotFound(notFound)).toBe(true);
    expect(isNotFound(new Error('envuelto', { cause: notFound }))).toBe(true);
  });

  it('descarta otros errores', () => {
    expect(isNotFound(new HttpErrorResponse({ status: 500 }))).toBe(false);
    expect(isNotFound(new Error('404'))).toBe(false);
    expect(isNotFound(undefined)).toBe(false);
  });
});
