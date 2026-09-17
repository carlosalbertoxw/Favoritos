import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';

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

  async function setup(id: string | null) {
    await TestBed.configureTestingModule({
      imports: [FavoritoDetail],
      providers: [
        provideRouter([]),
        { provide: FavoritoService, useValue: service },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap(id ? { id } : {}) } },
        },
      ],
    }).compileComponents();

    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const fixture = TestBed.createComponent(FavoritoDetail);
    await fixture.whenStable();
    return { el: fixture.nativeElement as HTMLElement, navigate };
  }

  beforeEach(() => {
    service = createFavoritoServiceMock();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => vi.restoreAllMocks());

  it('muestra el detalle del favorito', async () => {
    service.getFavorito.mockReturnValue(of({ favorito }));
    const { el, navigate } = await setup('1');

    expect(service.getFavorito).toHaveBeenCalledWith('1');
    expect(el.querySelector('h1')?.textContent).toBe('Angular');
    expect(el.querySelector('.description')?.textContent).toBe('Framework web');
    const link = el.querySelector('.url a');
    expect(link?.getAttribute('href')).toBe('https://angular.dev');
    expect(link?.getAttribute('target')).toBe('_blank');
    expect(link?.getAttribute('rel')).toBe('noopener');
    expect(navigate).not.toHaveBeenCalled();
  });

  it('redirige al inicio si no hay id', async () => {
    const { el, navigate } = await setup(null);

    expect(navigate).toHaveBeenCalledWith(['/']);
    expect(service.getFavorito).not.toHaveBeenCalled();
    expect(el.querySelector('.favorito-box')).toBeNull();
  });

  it('redirige al inicio si la respuesta no contiene el favorito', async () => {
    service.getFavorito.mockReturnValue(of({} as FavoritoResponse));
    const { el, navigate } = await setup('1');

    expect(navigate).toHaveBeenCalledWith(['/']);
    expect(el.querySelector('.favorito-box')).toBeNull();
  });

  it('redirige al inicio si la petición falla', async () => {
    service.getFavorito.mockReturnValue(throwError(() => new Error('404')));
    const { navigate } = await setup('1');

    expect(navigate).toHaveBeenCalledWith(['/']);
    expect(console.error).toHaveBeenCalled();
  });
});
