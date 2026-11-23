import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';

import { PAGE_SIZE, BookmarkList } from './bookmark-list';
import { BookmarkService } from '../services/bookmark.service';
import { Bookmark } from '../models/bookmark';
import { BookmarkServiceMock, createBookmarkServiceMock } from '../../testing/bookmark-service.mock';

describe('BookmarkList', () => {
  const bookmarks: Bookmark[] = [
    { id: '1', title: 'Angular', description: 'Framework', url: 'https://angular.dev' },
    { id: '2', title: 'Vitest', description: 'Testing', url: 'https://vitest.dev' },
  ];
  const paginaCompleta: Bookmark[] = Array.from({ length: PAGE_SIZE }, (_, i) => ({
    id: `p${i}`,
    title: `Bookmark ${i}`,
    description: '',
    url: `https://f${i}.com`,
  }));

  let service: BookmarkServiceMock;
  let fixture: ComponentFixture<BookmarkList>;
  let el: HTMLElement;

  async function render(): Promise<void> {
    fixture = TestBed.createComponent(BookmarkList);
    el = fixture.nativeElement;
    await fixture.whenStable();
  }

  async function click(selector: string): Promise<void> {
    el.querySelector<HTMLButtonElement>(selector)!.click();
    await fixture.whenStable();
  }

  beforeEach(async () => {
    service = createBookmarkServiceMock();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    await TestBed.configureTestingModule({
      imports: [BookmarkList],
      providers: [provideRouter([]), { provide: BookmarkService, useValue: service }],
    }).compileComponents();
  });

  afterEach(() => vi.restoreAllMocks());

  it('renderiza la primera página de favoritos', async () => {
    service.list.mockReturnValue(of({ bookmarks, hasMore: false }));
    await render();

    expect(service.list).toHaveBeenCalledWith(0, PAGE_SIZE);
    const items = el.querySelectorAll('.bookmark-item');
    expect(items.length).toBe(2);
    expect(items[0].querySelector('h4')?.textContent).toBe('Angular');
    expect(items[0].querySelector('.url')?.textContent).toBe('https://angular.dev');
    expect(el.querySelector('.loading')).toBeNull();
    expect(el.querySelector('.load-more')).toBeNull();
  });

  it('ofrece "Cargar más" solo si la API indica que hay más páginas', async () => {
    service.list.mockReturnValue(of({ bookmarks, hasMore: true }));
    await render();
    expect(el.querySelector('.load-more')).not.toBeNull();
  });

  it('no ofrece "Cargar más" con una página completa si la API dice que no hay más', async () => {
    service.list.mockReturnValue(of({ bookmarks: paginaCompleta, hasMore: false }));
    await render();
    expect(el.querySelectorAll('.bookmark-item').length).toBe(PAGE_SIZE);
    expect(el.querySelector('.load-more')).toBeNull();
  });

  it('genera los enlaces para ir, ver y editar', async () => {
    service.list.mockReturnValue(of({ bookmarks, hasMore: false }));
    await render();

    const item = el.querySelector('.bookmark-item')!;
    expect(item.querySelector('.btn-default')?.getAttribute('href')).toBe('https://angular.dev');
    expect(item.querySelector('.btn-view')?.getAttribute('href')).toBe('/favorito/1');
    expect(item.querySelector('.btn-edit')?.getAttribute('href')).toBe('/editar-favorito/1');
  });

  it('muestra el mensaje de lista vacía', async () => {
    service.list.mockReturnValue(of({ bookmarks: [], hasMore: false }));
    await render();

    expect(el.querySelector('.empty')?.textContent).toContain('No hay favoritos todavía.');
  });

  it('muestra un error si falla la carga, sin decir que la lista está vacía', async () => {
    service.list.mockReturnValue(throwError(() => new Error('boom')));
    await render();

    expect(el.querySelector('.error')?.textContent).toContain('Error al cargar los favoritos.');
    expect(el.querySelector('.empty')).toBeNull();
    expect(el.querySelector('.loading')).toBeNull();
    expect(console.error).toHaveBeenCalled();
  });

  it('carga la siguiente página y la agrega a la lista', async () => {
    service.list
      .mockReturnValueOnce(of({ bookmarks: paginaCompleta, hasMore: true }))
      .mockReturnValueOnce(of({ bookmarks, hasMore: false }));
    await render();

    await click('.load-more button');

    expect(service.list).toHaveBeenLastCalledWith(
      PAGE_SIZE,
      PAGE_SIZE,
    );
    expect(el.querySelectorAll('.bookmark-item').length).toBe(PAGE_SIZE + 2);
    expect(el.querySelector('.load-more')).toBeNull();
  });

  it('descuenta los favoritos borrados al pedir la siguiente página', async () => {
    service.list
      .mockReturnValueOnce(of({ bookmarks: paginaCompleta, hasMore: true }))
      .mockReturnValueOnce(of({ bookmarks, hasMore: false }));
    service.delete.mockReturnValue(of(undefined));
    await render();

    await click('.bookmark-item .btn-delete');
    await click('.confirm-delete .btn-delete');
    await click('.load-more button');

    expect(service.list).toHaveBeenLastCalledWith(
      PAGE_SIZE - 1,
      PAGE_SIZE,
    );
  });

  it('conserva lo cargado y permite reintentar si falla la siguiente página', async () => {
    service.list
      .mockReturnValueOnce(of({ bookmarks: paginaCompleta, hasMore: true }))
      .mockReturnValueOnce(throwError(() => new Error('boom')));
    await render();

    await click('.load-more button');

    expect(el.querySelector('.error')?.textContent).toContain('Error al cargar los favoritos.');
    expect(el.querySelectorAll('.bookmark-item').length).toBe(PAGE_SIZE);
    expect(el.querySelector('.load-more')).not.toBeNull();
  });

  it('pide confirmación antes de eliminar y permite cancelar', async () => {
    service.list.mockReturnValue(of({ bookmarks, hasMore: false }));
    await render();

    await click('.bookmark-item .btn-delete');
    expect(el.querySelectorAll('.confirm-delete').length).toBe(1);

    await click('.confirm-delete .btn-view');
    expect(el.querySelector('.confirm-delete')).toBeNull();
    expect(service.delete).not.toHaveBeenCalled();
  });

  it('elimina el favorito confirmado sin volver a pedir la lista', async () => {
    service.list.mockReturnValue(of({ bookmarks, hasMore: false }));
    service.delete.mockReturnValue(of(undefined));
    await render();

    await click('.bookmark-item .btn-delete');
    await click('.confirm-delete .btn-delete');

    expect(service.delete).toHaveBeenCalledWith('1');
    expect(service.list).toHaveBeenCalledTimes(1);
    expect(el.querySelectorAll('.bookmark-item').length).toBe(1);
    expect(el.querySelector('.bookmark-item h4')?.textContent).toBe('Vitest');
    expect(el.querySelector('.confirm-delete')).toBeNull();
  });

  it('muestra un error si falla la eliminación', async () => {
    service.list.mockReturnValue(of({ bookmarks, hasMore: false }));
    service.delete.mockReturnValue(throwError(() => new Error('boom')));
    await render();

    await click('.bookmark-item .btn-delete');
    await click('.confirm-delete .btn-delete');

    expect(el.querySelector('.error')?.textContent).toContain('Error al eliminar el favorito.');
    expect(el.querySelectorAll('.bookmark-item').length).toBe(2);
  });
});
