import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';

import { FAVORITOS_POR_PAGINA, FavoritosList } from './favoritos-list';
import { FavoritoService } from '../services/favorito.service';
import { Favorito } from '../models/favorito';
import { FavoritoServiceMock, createFavoritoServiceMock } from '../../testing/favorito-service.mock';

describe('FavoritosList', () => {
  const favoritos: Favorito[] = [
    { id: '1', title: 'Angular', description: 'Framework', url: 'https://angular.dev' },
    { id: '2', title: 'Vitest', description: 'Testing', url: 'https://vitest.dev' },
  ];
  const paginaCompleta: Favorito[] = Array.from({ length: FAVORITOS_POR_PAGINA }, (_, i) => ({
    id: `p${i}`,
    title: `Favorito ${i}`,
    description: '',
    url: `https://f${i}.com`,
  }));

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

  it('renderiza la primera página de favoritos', async () => {
    service.getFavoritos.mockReturnValue(of({ favoritos }));
    await render();

    expect(service.getFavoritos).toHaveBeenCalledWith(0, FAVORITOS_POR_PAGINA);
    const items = el.querySelectorAll('.favorito-item');
    expect(items.length).toBe(2);
    expect(items[0].querySelector('h4')?.textContent).toBe('Angular');
    expect(items[0].querySelector('.url')?.textContent).toBe('https://angular.dev');
    expect(el.querySelector('.loading')).toBeNull();
    expect(el.querySelector('.cargar-mas')).toBeNull();
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

  it('muestra un error si falla la carga, sin decir que la lista está vacía', async () => {
    service.getFavoritos.mockReturnValue(throwError(() => new Error('boom')));
    await render();

    expect(el.querySelector('.error')?.textContent).toContain('Error al cargar los favoritos.');
    expect(el.querySelector('.empty')).toBeNull();
    expect(el.querySelector('.loading')).toBeNull();
    expect(console.error).toHaveBeenCalled();
  });

  it('carga la siguiente página y la agrega a la lista', async () => {
    service.getFavoritos
      .mockReturnValueOnce(of({ favoritos: paginaCompleta }))
      .mockReturnValueOnce(of({ favoritos }));
    await render();

    await click('.cargar-mas button');

    expect(service.getFavoritos).toHaveBeenLastCalledWith(
      FAVORITOS_POR_PAGINA,
      FAVORITOS_POR_PAGINA,
    );
    expect(el.querySelectorAll('.favorito-item').length).toBe(FAVORITOS_POR_PAGINA + 2);
    expect(el.querySelector('.cargar-mas')).toBeNull();
  });

  it('descuenta los favoritos borrados al pedir la siguiente página', async () => {
    service.getFavoritos
      .mockReturnValueOnce(of({ favoritos: paginaCompleta }))
      .mockReturnValueOnce(of({ favoritos }));
    service.deleteFavorito.mockReturnValue(of(undefined));
    await render();

    await click('.favorito-item .btn-eliminar');
    await click('.seguro .btn-eliminar');
    await click('.cargar-mas button');

    expect(service.getFavoritos).toHaveBeenLastCalledWith(
      FAVORITOS_POR_PAGINA - 1,
      FAVORITOS_POR_PAGINA,
    );
  });

  it('conserva lo cargado y permite reintentar si falla la siguiente página', async () => {
    service.getFavoritos
      .mockReturnValueOnce(of({ favoritos: paginaCompleta }))
      .mockReturnValueOnce(throwError(() => new Error('boom')));
    await render();

    await click('.cargar-mas button');

    expect(el.querySelector('.error')?.textContent).toContain('Error al cargar los favoritos.');
    expect(el.querySelectorAll('.favorito-item').length).toBe(FAVORITOS_POR_PAGINA);
    expect(el.querySelector('.cargar-mas')).not.toBeNull();
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

  it('elimina el favorito confirmado sin volver a pedir la lista', async () => {
    service.getFavoritos.mockReturnValue(of({ favoritos }));
    service.deleteFavorito.mockReturnValue(of(undefined));
    await render();

    await click('.favorito-item .btn-eliminar');
    await click('.seguro .btn-eliminar');

    expect(service.deleteFavorito).toHaveBeenCalledWith('1');
    expect(service.getFavoritos).toHaveBeenCalledTimes(1);
    expect(el.querySelectorAll('.favorito-item').length).toBe(1);
    expect(el.querySelector('.favorito-item h4')?.textContent).toBe('Vitest');
    expect(el.querySelector('.seguro')).toBeNull();
  });

  it('muestra un error si falla la eliminación', async () => {
    service.getFavoritos.mockReturnValue(of({ favoritos }));
    service.deleteFavorito.mockReturnValue(throwError(() => new Error('boom')));
    await render();

    await click('.favorito-item .btn-eliminar');
    await click('.seguro .btn-eliminar');

    expect(el.querySelector('.error')?.textContent).toContain('Error al eliminar el favorito.');
    expect(el.querySelectorAll('.favorito-item').length).toBe(2);
  });
});
