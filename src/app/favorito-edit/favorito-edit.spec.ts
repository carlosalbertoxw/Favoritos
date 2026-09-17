import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';

import { FavoritoEdit } from './favorito-edit';
import { FavoritoService } from '../services/favorito.service';
import { Favorito, FavoritoResponse } from '../models/favorito';
import { FavoritoServiceMock, createFavoritoServiceMock } from '../../testing/favorito-service.mock';
import { fillInput, submitForm } from '../../testing/dom';

describe('FavoritoEdit', () => {
  const favorito: Favorito = {
    id: '1',
    title: 'Angular',
    description: 'Framework web',
    url: 'https://angular.dev',
  };

  let service: FavoritoServiceMock;

  async function setup(id: string | null) {
    await TestBed.configureTestingModule({
      imports: [FavoritoEdit],
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
    const fixture = TestBed.createComponent(FavoritoEdit);
    await fixture.whenStable();
    return { fixture, el: fixture.nativeElement as HTMLElement, navigate };
  }

  beforeEach(() => {
    service = createFavoritoServiceMock();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => vi.restoreAllMocks());

  it('carga el favorito en el formulario', async () => {
    service.getFavorito.mockReturnValue(of({ favorito }));
    const { el } = await setup('1');

    expect(service.getFavorito).toHaveBeenCalledWith('1');
    expect(el.querySelector('h1')?.textContent).toBe('Editar favorito');
    expect(el.querySelector<HTMLInputElement>('#title')?.value).toBe('Angular');
    expect(el.querySelector<HTMLTextAreaElement>('#description')?.value).toBe('Framework web');
    expect(el.querySelector<HTMLInputElement>('#url')?.value).toBe('https://angular.dev');
  });

  it('redirige al inicio si no hay id', async () => {
    const { navigate } = await setup(null);

    expect(navigate).toHaveBeenCalledWith(['/']);
    expect(service.getFavorito).not.toHaveBeenCalled();
  });

  it('no envía el formulario si no hay id', async () => {
    const { fixture, navigate } = await setup(null);
    navigate.mockClear();

    await fillInput(fixture, '#title', 'T');
    await fillInput(fixture, '#description', 'D');
    await fillInput(fixture, '#url', 'https://u.com');
    await submitForm(fixture);

    expect(service.editFavorito).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });

  it('redirige al inicio si la respuesta no contiene el favorito', async () => {
    service.getFavorito.mockReturnValue(of({} as FavoritoResponse));
    const { navigate } = await setup('1');

    expect(navigate).toHaveBeenCalledWith(['/']);
  });

  it('redirige al inicio si la carga falla', async () => {
    service.getFavorito.mockReturnValue(throwError(() => new Error('404')));
    const { navigate } = await setup('1');

    expect(navigate).toHaveBeenCalledWith(['/']);
    expect(console.error).toHaveBeenCalled();
  });

  it('no envía y muestra errores si se vacía un campo obligatorio', async () => {
    service.getFavorito.mockReturnValue(of({ favorito }));
    const { fixture, el, navigate } = await setup('1');

    await fillInput(fixture, '#title', '');
    await submitForm(fixture);

    expect(service.editFavorito).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
    expect(el.querySelector('span.error')?.textContent).toBe('¡El título es obligatorio!');
  });

  it('envía los cambios y navega al inicio', async () => {
    service.getFavorito.mockReturnValue(of({ favorito }));
    service.editFavorito.mockReturnValue(of({ favorito: { ...favorito, title: 'Nuevo' } }));
    const { fixture, navigate } = await setup('1');

    await fillInput(fixture, '#title', 'Nuevo');
    await submitForm(fixture);

    expect(service.editFavorito).toHaveBeenCalledWith('1', {
      title: 'Nuevo',
      description: 'Framework web',
      url: 'https://angular.dev',
    });
    expect(navigate).toHaveBeenCalledWith(['/']);
  });

  it('muestra un error si falla la actualización', async () => {
    service.getFavorito.mockReturnValue(of({ favorito }));
    service.editFavorito.mockReturnValue(throwError(() => new Error('500')));
    const { fixture, el, navigate } = await setup('1');

    await submitForm(fixture);

    expect(el.querySelector('p.error')?.textContent).toBe('Error al actualizar el favorito.');
    expect(navigate).not.toHaveBeenCalled();
  });

  it('permite dejar la descripción vacía', async () => {
    service.getFavorito.mockReturnValue(of({ favorito }));
    service.editFavorito.mockReturnValue(of({ favorito: { ...favorito, description: '' } }));
    const { fixture, navigate } = await setup('1');

    await fillInput(fixture, '#description', '   ');
    await submitForm(fixture);

    expect(service.editFavorito).toHaveBeenCalledWith('1', {
      title: 'Angular',
      description: '',
      url: 'https://angular.dev',
    });
    expect(navigate).toHaveBeenCalledWith(['/']);
  });

  it('no envía una URL inválida', async () => {
    service.getFavorito.mockReturnValue(of({ favorito }));
    const { fixture, el } = await setup('1');

    await fillInput(fixture, '#url', 'javascript:alert(1)');
    await submitForm(fixture);

    expect(service.editFavorito).not.toHaveBeenCalled();
    expect(el.querySelector('span.error')?.textContent).toBe(
      '¡La URL debe empezar con http:// o https://!',
    );
  });

  it('muestra en el campo el error de validación de la API', async () => {
    service.getFavorito.mockReturnValue(of({ favorito }));
    service.editFavorito.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 400,
            error: {
              message: 'Datos inválidos',
              errors: [{ path: 'url', message: 'La URL no es válida' }],
            },
          }),
      ),
    );
    const { fixture, el } = await setup('1');

    await submitForm(fixture);

    expect(el.querySelector('p.error')?.textContent).toBe(
      'Error al actualizar el favorito. Revisa los campos marcados.',
    );
    expect(el.querySelector('span.error')?.textContent).toBe('La URL no es válida');
  });

  it('muestra el mensaje de la API si el favorito ya no existe', async () => {
    service.getFavorito.mockReturnValue(of({ favorito }));
    service.editFavorito.mockReturnValue(
      throwError(
        () => new HttpErrorResponse({ status: 404, error: { message: 'No existe el marcador' } }),
      ),
    );
    const { fixture, el } = await setup('1');

    await submitForm(fixture);

    expect(el.querySelector('p.error')?.textContent).toBe(
      'Error al actualizar el favorito. No existe el marcador.',
    );
  });
});
