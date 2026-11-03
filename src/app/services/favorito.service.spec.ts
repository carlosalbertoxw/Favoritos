import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { FavoritoService } from './favorito.service';
import { environment } from '../../environments/environment';
import { Favorito, NuevoFavorito } from '../models/favorito';

describe('FavoritoService', () => {
  const baseUrl = `${environment.apiUrl}/favoritos`;
  const favorito: Favorito = {
    id: '1',
    title: 'Angular',
    description: 'Framework web',
    url: 'https://angular.dev',
  };
  const datos: NuevoFavorito = { title: 'Nuevo', description: 'Desc', url: 'https://x.com' };

  let service: FavoritoService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(FavoritoService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('getFavoritos hace GET a /favoritos con la paginación', () => {
    let result: unknown;
    service.getFavoritos(40, 20).subscribe((res) => (result = res));

    const req = httpMock.expectOne(`${baseUrl}?skip=40&limit=20`);
    expect(req.request.method).toBe('GET');
    req.flush({ favoritos: [favorito] });

    expect(result).toEqual({ favoritos: [favorito] });
  });

  it('getFavorito hace GET a /favoritos/:id', () => {
    let result: unknown;
    service.getFavorito('1').subscribe((res) => (result = res));

    const req = httpMock.expectOne(`${baseUrl}/1`);
    expect(req.request.method).toBe('GET');
    req.flush({ favorito });

    expect(result).toEqual({ favorito });
  });

  it('addFavorito hace POST a /favoritos con el cuerpo', () => {
    service.addFavorito(datos).subscribe();

    const req = httpMock.expectOne(baseUrl);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(datos);
    req.flush({ favorito: { ...datos, id: '2' } });
  });

  it('editFavorito hace PATCH a /favoritos/:id con el cuerpo', () => {
    service.editFavorito('1', datos).subscribe();

    const req = httpMock.expectOne(`${baseUrl}/1`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual(datos);
    req.flush({ favorito });
  });

  it('deleteFavorito hace DELETE a /favoritos/:id y acepta la respuesta 204 sin cuerpo', () => {
    let completado = false;
    service.deleteFavorito('1').subscribe({ complete: () => (completado = true) });

    const req = httpMock.expectOne(`${baseUrl}/1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null, { status: 204, statusText: 'No Content' });

    expect(completado).toBe(true);
  });

  it('codifica el id para que no altere la ruta de la API', () => {
    const id = '../favoritos?x=1#y';
    const encoded = encodeURIComponent(id);

    service.getFavorito(id).subscribe();
    service.editFavorito(id, datos).subscribe();
    service.deleteFavorito(id).subscribe();

    const reqs = httpMock.match(`${baseUrl}/${encoded}`);
    expect(reqs.map((req) => req.request.method)).toEqual(['GET', 'PATCH', 'DELETE']);
    reqs.forEach((req) => req.flush({}));
  });

  it('propaga los errores HTTP', () => {
    let status: number | undefined;
    service.getFavoritos(0, 20).subscribe({ error: (err) => (status = err.status) });

    httpMock
      .expectOne(`${baseUrl}?skip=0&limit=20`)
      .flush('Error', { status: 500, statusText: 'Server Error' });

    expect(status).toBe(500);
  });
});
