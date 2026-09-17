import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';

import { FavoritosList } from './favoritos-list';
import { FavoritoService } from '../services/favorito.service';
import { Favorito, FavoritosResponse } from '../models/favorito';
import { FavoritoServiceMock, createFavoritoServiceMock } from '../../testing/favorito-service.mock';

describe('FavoritosList', () => {
  const favoritos: Favorito[] = [
    { id: '1', title: 'Angular', description: 'Framework', url: 'https://angular.dev' },
    { id: '2', title: 'Vitest', description: 'Testing', url: 'https://vitest.dev' },
  ];

  let service: FavoritoServiceMock;
  let fixture: ComponentFixture<FavoritosList>;
  let el: HTMLElement;

  async function render(): Promise<void> {
    fixture = TestBed.createComponent(FavoritosList);
    el = fixture.nativeElement;
    await fixture.whenStable();
  }

  async function click(selector: string): Promise<void> {
    el.querySelector<HTMLButtonElement>(selector)!.click();
    await fixture.whenStable();
  }

  beforeEach(async () => {
    service = createFavoritoServiceMock();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    await TestBed.configureTestingModule({
      imports: [FavoritosList],
      providers: [provideRouter([]), { provide: FavoritoService, useValue: service }],
    }).compileComponents();
  });

  afterEach(() => vi.restoreAllMocks());

  it('renderiza la lista de favoritos', async () => {
    service.getFavoritos.mockReturnValue(of({ favoritos }));
    await render();

    const items = el.querySelectorAll('.favorito-item');
    expect(items.length).toBe(2);
    expect(items[0].querySelector('h4')?.textContent).toBe('Angular');
    expect(items[0].querySelector('.url')?.textContent).toBe('https://angular.dev');
    expect(el.querySelector('.loading')).toBeNull();
  });

  it('genera los enlaces para ir, ver y editar', async () => {
    service.getFavoritos.mockReturnValue(of({ favoritos }));
    await render();

    const item = el.querySelector('.favorito-item')!;
    expect(item.querySelector('.btn-default')?.getAttribute('href')).toBe('https://angular.dev');
    expect(item.querySelector('.btn-ver')?.getAttribute('href')).toBe('/favorito/1');
    expect(item.querySelector('.btn-editar')?.getAttribute('href')).toBe('/editar-favorito/1');
  });

  it('muestra el mensaje de lista vacía', async () => {
    service.getFavoritos.mockReturnValue(of({ favoritos: [] }));
    await render();

    expect(el.querySelector('.empty')?.textContent).toContain('No hay favoritos todavía.');
  });

  it('tolera una respuesta sin la propiedad favoritos', async () => {
    service.getFavoritos.mockReturnValue(of({} as FavoritosResponse));
    await render();

    expect(el.querySelector('.empty')).not.toBeNull();
  });

  it('muestra un error si falla la carga', async () => {
    service.getFavoritos.mockReturnValue(throwError(() => new Error('boom')));
    await render();

    expect(el.querySelector('.error')?.textContent).toContain('Error al cargar los favoritos.');
    expect(el.querySelector('.loading')).toBeNull();
    expect(console.error).toHaveBeenCalled();
  });

  it('pide confirmación antes de eliminar y permite cancelar', async () => {
    service.getFavoritos.mockReturnValue(of({ favoritos }));
    await render();

    await click('.favorito-item .btn-eliminar');
    expect(el.querySelectorAll('.seguro').length).toBe(1);

    await click('.seguro .btn-ver');
    expect(el.querySelector('.seguro')).toBeNull();
    expect(service.deleteFavorito).not.toHaveBeenCalled();
  });

  it('elimina el favorito confirmado y recarga la lista', async () => {
    service.getFavoritos
      .mockReturnValueOnce(of({ favoritos }))
      .mockReturnValueOnce(of({ favoritos: [favoritos[1]] }));
    service.deleteFavorito.mockReturnValue(of({ message: 'ok' }));
    await render();

    await click('.favorito-item .btn-eliminar');
    await click('.seguro .btn-eliminar');

    expect(service.deleteFavorito).toHaveBeenCalledWith('1');
    expect(service.getFavoritos).toHaveBeenCalledTimes(2);
    expect(el.querySelectorAll('.favorito-item').length).toBe(1);
    expect(el.querySelector('.seguro')).toBeNull();
  });

  it('muestra un error si falla la eliminación', async () => {
    service.getFavoritos.mockReturnValue(of({ favoritos }));
    service.deleteFavorito.mockReturnValue(throwError(() => new Error('boom')));
    await render();

    await click('.favorito-item .btn-eliminar');
    await click('.seguro .btn-eliminar');

    expect(el.querySelector('.error')?.textContent).toContain('Error al eliminar el favorito.');
    expect(service.getFavoritos).toHaveBeenCalledTimes(1);
  });
});
