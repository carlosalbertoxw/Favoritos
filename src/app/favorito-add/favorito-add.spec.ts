import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { Router, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';

import { FavoritoAdd } from './favorito-add';
import { FavoritoService } from '../services/favorito.service';
import { FavoritoServiceMock, createFavoritoServiceMock } from '../../testing/favorito-service.mock';
import { fillInput, submitForm } from '../../testing/dom';

describe('FavoritoAdd', () => {
  let service: FavoritoServiceMock;

  async function setup() {
    await TestBed.configureTestingModule({
      imports: [FavoritoAdd],
      providers: [provideRouter([]), { provide: FavoritoService, useValue: service }],
    }).compileComponents();

    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const fixture = TestBed.createComponent(FavoritoAdd);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    const fieldErrors = () => Array.from(el.querySelectorAll('span.error')).map((e) => e.textContent);
    const fill = async (title: string, description: string, url: string) => {
      await fillInput(fixture, '#title', title);
      await fillInput(fixture, '#description', description);
      await fillInput(fixture, '#url', url);
    };
    return { fixture, el, navigate, fieldErrors, fill };
  }

  beforeEach(() => {
    service = createFavoritoServiceMock();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => vi.restoreAllMocks());

  it('muestra el título de la sección y el formulario vacío', async () => {
    const { el } = await setup();

    expect(el.querySelector('h1')?.textContent).toBe('Agregar favorito');
    expect(el.querySelector<HTMLInputElement>('#title')?.value).toBe('');
    expect(el.querySelector<HTMLTextAreaElement>('#description')?.value).toBe('');
    expect(el.querySelector<HTMLInputElement>('#url')?.value).toBe('');
    expect(el.querySelector('button[type="submit"]')?.textContent).toBe('Agregar favorito');
    expect(el.querySelector('.error')).toBeNull();
  });

  it('no envía y muestra errores de los campos obligatorios si el formulario está vacío', async () => {
    const { fixture, navigate, fieldErrors } = await setup();

    await submitForm(fixture);

    expect(service.addFavorito).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
    expect(fieldErrors()).toEqual(['¡El título es obligatorio!', '¡La URL es obligatoria!']);
  });

  it('considera vacío un título con solo espacios', async () => {
    const { fixture, fill, fieldErrors } = await setup();

    await fill('   ', '', 'https://a.com');
    await submitForm(fixture);

    expect(service.addFavorito).not.toHaveBeenCalled();
    expect(fieldErrors()).toEqual(['¡El título es obligatorio!']);
  });

  it('rechaza una URL sin http:// o https://', async () => {
    const { fixture, fill, fieldErrors } = await setup();

    await fill('T', '', 'docs.docker.com');
    await submitForm(fixture);

    expect(service.addFavorito).not.toHaveBeenCalled();
    expect(fieldErrors()).toEqual(['¡La URL debe empezar con http:// o https://!']);
  });

  it('rechaza una URL con http:// pero mal formada', async () => {
    const { fixture, fill, fieldErrors } = await setup();

    await fill('T', '', 'http://a b.com');
    await submitForm(fixture);

    expect(service.addFavorito).not.toHaveBeenCalled();
    expect(fieldErrors()).toEqual(['¡La URL no es válida!']);
  });

  it('rechaza título y descripción que superan los límites de la API', async () => {
    const { fixture, fill, fieldErrors } = await setup();

    await fill('a'.repeat(201), 'a'.repeat(1001), 'https://a.com');
    await submitForm(fixture);

    expect(service.addFavorito).not.toHaveBeenCalled();
    expect(fieldErrors()).toEqual([
      '¡El título no puede tener más de 200 caracteres!',
      '¡La descripción no puede tener más de 1000 caracteres!',
    ]);
  });

  it('envía el favorito sin descripción y con los valores recortados', async () => {
    service.addFavorito.mockReturnValue(
      of({ favorito: { id: '9', title: 'T', description: '', url: 'https://u.com' } }),
    );
    const { fixture, fill, navigate, fieldErrors } = await setup();

    await fill('  T  ', '', ' https://u.com ');
    await submitForm(fixture);

    expect(service.addFavorito).toHaveBeenCalledWith({
      title: 'T',
      description: '',
      url: 'https://u.com',
    });
    expect(navigate).toHaveBeenCalledWith(['/']);
    expect(fieldErrors()).toEqual([]);
  });

  it('muestra en cada campo los errores de validación que devuelve la API', async () => {
    service.addFavorito.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 400,
            error: {
              message: 'Datos inválidos',
              errors: [{ path: 'title', message: 'El título ya existe' }],
            },
          }),
      ),
    );
    const { fixture, el, fill, navigate, fieldErrors } = await setup();

    await fill('T', 'D', 'https://u.com');
    await submitForm(fixture);

    expect(navigate).not.toHaveBeenCalled();
    expect(el.querySelector('p.error')?.textContent).toBe(
      'Error al guardar el favorito. Revisa los campos marcados.',
    );
    expect(fieldErrors()).toEqual(['El título ya existe']);

    // Al corregir el campo desaparece el error de la API.
    await fillInput(fixture, '#title', 'Otro');
    expect(fieldErrors()).toEqual([]);
  });

  it('muestra el mensaje de la API si el error no es de un campo', async () => {
    service.addFavorito.mockReturnValue(
      throwError(
        () => new HttpErrorResponse({ status: 500, error: { message: 'Error interno del servidor' } }),
      ),
    );
    const { fixture, el, fill } = await setup();

    await fill('T', 'D', 'https://u.com');
    await submitForm(fixture);

    expect(el.querySelector('p.error')?.textContent).toBe(
      'Error al guardar el favorito. Error interno del servidor.',
    );
  });

  it('muestra un error genérico si falla el guardado sin detalle', async () => {
    service.addFavorito.mockReturnValue(throwError(() => new Error('500')));
    const { fixture, el, fill, navigate } = await setup();

    await fill('T', 'D', 'https://u.com');
    await submitForm(fixture);

    expect(el.querySelector('p.error')?.textContent).toBe('Error al guardar el favorito.');
    expect(navigate).not.toHaveBeenCalled();
    expect(console.error).toHaveBeenCalled();
  });
});
