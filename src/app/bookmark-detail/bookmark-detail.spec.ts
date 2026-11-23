import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { Subject, of, throwError } from 'rxjs';

import { BookmarkDetail } from './bookmark-detail';
import { BookmarkService } from '../services/bookmark.service';
import { Bookmark, BookmarkResponse } from '../models/bookmark';
import { BookmarkServiceMock, createBookmarkServiceMock } from '../../testing/bookmark-service.mock';

describe('BookmarkDetail', () => {
  const bookmark: Bookmark = {
    id: '1',
    title: 'Angular',
    description: 'Framework web',
    url: 'https://angular.dev',
  };

  let service: BookmarkServiceMock;

  /**
   * Con `pending`, la respuesta aún no llega: whenStable() esperaría a que el resource
   * termine de cargar, así que solo se ejecuta un ciclo de detección de cambios.
   */
  async function setup({ pending = false } = {}) {
    await TestBed.configureTestingModule({
      imports: [BookmarkDetail],
      providers: [provideRouter([]), { provide: BookmarkService, useValue: service }],
    }).compileComponents();

    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const fixture = TestBed.createComponent(BookmarkDetail);
    fixture.componentRef.setInput('id', '1');
    if (pending) {
      TestBed.tick();
    } else {
      await fixture.whenStable();
    }
    return { fixture, el: fixture.nativeElement as HTMLElement, navigate };
  }

  beforeEach(() => {
    service = createBookmarkServiceMock();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => vi.restoreAllMocks());

  it('muestra el detalle del favorito', async () => {
    service.get.mockReturnValue(of({ bookmark }));
    const { el, navigate } = await setup();

    expect(service.get).toHaveBeenCalledWith('1');
    expect(el.querySelector('h1')?.textContent).toBe('Angular');
    expect(el.querySelector('.description')?.textContent).toBe('Framework web');
    const link = el.querySelector('.url a');
    expect(link?.getAttribute('href')).toBe('https://angular.dev');
    expect(link?.getAttribute('target')).toBe('_blank');
    expect(link?.getAttribute('rel')).toBe('noopener');
    expect(navigate).not.toHaveBeenCalled();
  });

  it('redirige al inicio si el favorito no existe', async () => {
    service.get.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 404 })));
    const { navigate } = await setup();

    expect(navigate).toHaveBeenCalledWith(['/']);
    expect(console.error).toHaveBeenCalled();
  });

  it('muestra un error y permite reintentar si la carga falla por otro motivo', async () => {
    service.get
      .mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 500 })))
      .mockReturnValueOnce(of({ bookmark }));
    const { fixture, el, navigate } = await setup();

    expect(navigate).not.toHaveBeenCalled();
    expect(el.querySelector('.error')?.textContent).toBe('No se pudo cargar el favorito.');

    el.querySelector<HTMLButtonElement>('button')!.click();
    await fixture.whenStable();

    expect(service.get).toHaveBeenCalledTimes(2);
    expect(el.querySelector('h1')?.textContent).toBe('Angular');
    expect(el.querySelector('.error')).toBeNull();
  });

  it('muestra un indicador mientras carga', async () => {
    service.get.mockReturnValue(new Subject<BookmarkResponse>());
    const { el } = await setup({ pending: true });

    expect(el.querySelector('.loading')).not.toBeNull();
  });

  it('no redirige si la petición falla después de salir de la página', async () => {
    const respuesta = new Subject<BookmarkResponse>();
    service.get.mockReturnValue(respuesta);
    const { fixture, navigate } = await setup({ pending: true });

    fixture.destroy();
    respuesta.error(new Error('404'));

    expect(navigate).not.toHaveBeenCalled();
  });
});
