import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { FavoritoService } from './favorito.service';
import { environment } from '../../environments/environment';
import { Favorito } from '../models/favorito';

describe('FavoritoService', () => {
  const baseUrl = environment.apiUrl;
  const favorito: Favorito = {
    id: '1',
    title: 'Angular',
    description: 'Framework web',
    url: 'https://angular.dev',
  };

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

  it('getFavoritos hace GET a /favoritos', () => {
    let result: unknown;
    service.getFavoritos().subscribe((res) => (result = res));

    const req = httpMock.expectOne(`${baseUrl}/favoritos`);
    expect(req.request.method).toBe('GET');
    req.flush({ favoritos: [favorito] });

    expect(result).toEqual({ favoritos: [favorito] });
  });

  it('getFavorito hace GET a /favorito/:id', () => {
    let result: unknown;
    service.getFavorito('1').subscribe((res) => (result = res));

    const req = httpMock.expectOne(`${baseUrl}/favorito/1`);
    expect(req.request.method).toBe('GET');
    req.flush({ favorito });

    expect(result).toEqual({ favorito });
  });

  it('addFavorito hace POST a /favorito con el cuerpo', () => {
    const nuevo: Favorito = { title: 'Nuevo', description: 'Desc', url: 'https://x.com' };
    service.addFavorito(nuevo).subscribe();

    const req = httpMock.expectOne(`${baseUrl}/favorito`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(nuevo);
    req.flush({ favorito: { ...nuevo, id: '2' } });
  });

  it('editFavorito hace PUT a /favorito/:id con el cuerpo', () => {
    service.editFavorito('1', favorito).subscribe();

    const req = httpMock.expectOne(`${baseUrl}/favorito/1`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(favorito);
    req.flush({ favorito });
  });

  it('deleteFavorito hace DELETE a /favorito/:id', () => {
    let result: unknown;
    service.deleteFavorito('1').subscribe((res) => (result = res));

    const req = httpMock.expectOne(`${baseUrl}/favorito/1`);
    expect(req.request.method).toBe('DELETE');
    req.flush({ message: 'Eliminado' });

    expect(result).toEqual({ message: 'Eliminado' });
  });

  it('propaga los errores HTTP', () => {
    let status: number | undefined;
    service.getFavoritos().subscribe({ error: (err) => (status = err.status) });

    httpMock
      .expectOne(`${baseUrl}/favoritos`)
      .flush('Error', { status: 500, statusText: 'Server Error' });

    expect(status).toBe(500);
  });
});
