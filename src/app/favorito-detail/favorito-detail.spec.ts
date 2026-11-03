import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';

import { FavoritoDetail } from './favorito-detail';
import { FavoritoService } from '../services/favorito.service';
import { Favorito, FavoritoResponse } from '../models/favorito';
import { FavoritoServiceMock, createFavoritoServiceMock } from '../../testing/favorito-service.mock';

describe('FavoritoDetail', () => {
  const favorito: Favorito = {
    id: '1',
    title: 'Angular',
    description: 'Framework web',
    url: 'https://angular.dev',
  };

  let service: FavoritoServiceMock;

  async function setup() {
    await TestBed.configureTestingModule({
      imports: [FavoritoDetail],
      providers: [provideRouter([]), { provide: FavoritoService, useValue: service }],
    }).compileComponents();

    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const fixture = TestBed.createComponent(FavoritoDetail);
    fixture.componentRef.setInput('id', '1');
    await fixture.whenStable();
    return { fixture, el: fixture.nativeElement as HTMLElement, navigate };
  }

  beforeEach(() => {
    service = createFavoritoServiceMock();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => vi.restoreAllMocks());

  it('muestra el detalle del favorito', async () => {
    service.getFavorito.mockReturnValue(of({ favorito }));
    const { el, navigate } = await setup();

    expect(service.getFavorito).toHaveBeenCalledWith('1');
    expect(el.querySelector('h1')?.textContent).toBe('Angular');
    expect(el.querySelector('.description')?.textContent).toBe('Framework web');
    const link = el.querySelector('.url a');
    expect(link?.getAttribute('href')).toBe('https://angular.dev');
    expect(link?.getAttribute('target')).toBe('_blank');
    expect(link?.getAttribute('rel')).toBe('noopener');
    expect(navigate).not.toHaveBeenCalled();
  });

  it('redirige al inicio si la petición falla', async () => {
    service.getFavorito.mockReturnValue(throwError(() => new Error('404')));
    const { navigate } = await setup();

    expect(navigate).toHaveBeenCalledWith(['/']);
    expect(console.error).toHaveBeenCalled();
  });

  it('no redirige si la petición falla después de salir de la página', async () => {
    const respuesta = new Subject<FavoritoResponse>();
    service.getFavorito.mockReturnValue(respuesta);
    const { fixture, navigate } = await setup();

    fixture.destroy();
    respuesta.error(new Error('404'));

    expect(navigate).not.toHaveBeenCalled();
  });
});
