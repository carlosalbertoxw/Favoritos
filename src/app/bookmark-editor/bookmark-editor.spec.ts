import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { Router, provideRouter } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';

import { BookmarkEditor } from './bookmark-editor';
import { BookmarkService } from '../services/bookmark.service';
import { Bookmark, BookmarkResponse } from '../models/bookmark';
import { BookmarkServiceMock, createBookmarkServiceMock } from '../../testing/bookmark-service.mock';
import { fillInput, submitForm } from '../../testing/dom';

describe('BookmarkEditor', () => {
  const bookmark: Bookmark = {
    id: '1',
    title: 'Angular',
    description: 'Framework web',
    url: 'https://angular.dev',
  };

  let service: BookmarkServiceMock;

  /**
   * Con `pending`, la carga del favorito aún no responde: whenStable() esperaría a que el
   * resource termine, así que solo se ejecuta un ciclo de detección de cambios.
   */
  async function setup(id?: string, { pending = false } = {}) {
    await TestBed.configureTestingModule({
      imports: [BookmarkEditor],
      providers: [provideRouter([]), { provide: BookmarkService, useValue: service }],
    }).compileComponents();

    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const fixture = TestBed.createComponent(BookmarkEditor);
    if (id) {
      fixture.componentRef.setInput('id', id);
    }
    if (pending) {
      TestBed.tick();
    } else {
      await fixture.whenStable();
    }
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
    service = createBookmarkServiceMock();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => vi.restoreAllMocks());

  describe('alta', () => {
    it('muestra el título de la sección y el formulario vacío', async () => {
      const { el } = await setup();

      expect(service.get).not.toHaveBeenCalled();
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

      expect(service.create).not.toHaveBeenCalled();
      expect(navigate).not.toHaveBeenCalled();
      expect(fieldErrors()).toEqual(['¡El título es obligatorio!', '¡La URL es obligatoria!']);
    });

    it('considera vacío un título con solo espacios', async () => {
      const { fixture, fill, fieldErrors } = await setup();

      await fill('   ', '', 'https://a.com');
      await submitForm(fixture);

      expect(service.create).not.toHaveBeenCalled();
      expect(fieldErrors()).toEqual(['¡El título es obligatorio!']);
    });

    it('rechaza una URL sin http:// o https://', async () => {
      const { fixture, fill, fieldErrors } = await setup();

      await fill('T', '', 'docs.docker.com');
      await submitForm(fixture);

      expect(service.create).not.toHaveBeenCalled();
      expect(fieldErrors()).toEqual(['¡La URL debe empezar con http:// o https://!']);
    });

    it('rechaza una URL con http:// pero mal formada', async () => {
      const { fixture, fill, fieldErrors } = await setup();

      await fill('T', '', 'http://a b.com');
      await submitForm(fixture);

      expect(service.create).not.toHaveBeenCalled();
      expect(fieldErrors()).toEqual(['¡La URL no es válida!']);
    });

    it('rechaza título y descripción que superan los límites de la API', async () => {
      const { fixture, fill, fieldErrors } = await setup();

      await fill('a'.repeat(201), 'a'.repeat(1001), 'https://a.com');
      await submitForm(fixture);

      expect(service.create).not.toHaveBeenCalled();
      expect(fieldErrors()).toEqual([
        '¡El título no puede tener más de 200 caracteres!',
        '¡La descripción no puede tener más de 1000 caracteres!',
      ]);
    });

    it('envía el favorito sin descripción y con los valores recortados', async () => {
      service.create.mockReturnValue(
        of({ bookmark: { id: '9', title: 'T', description: '', url: 'https://u.com' } }),
      );
      const { fixture, fill, navigate, fieldErrors } = await setup();

      await fill('  T  ', '', ' https://u.com ');
      await submitForm(fixture);

      expect(service.create).toHaveBeenCalledWith({
        title: 'T',
        description: '',
        url: 'https://u.com',
      });
      expect(service.update).not.toHaveBeenCalled();
      expect(navigate).toHaveBeenCalledWith(['/']);
      expect(fieldErrors()).toEqual([]);
    });

    it('ignora un segundo envío mientras el primero está en curso', async () => {
      const respuesta = new Subject<BookmarkResponse>();
      service.create.mockReturnValue(respuesta);
      const { fixture, el, fill, navigate } = await setup();
      const boton = () => el.querySelector<HTMLButtonElement>('button[type="submit"]')!;

      await fill('T', '', 'https://u.com');
      await submitForm(fixture);
      expect(boton().disabled).toBe(true);

      await submitForm(fixture);
      expect(service.create).toHaveBeenCalledTimes(1);

      respuesta.next({ bookmark });
      respuesta.complete();
      expect(navigate).toHaveBeenCalledWith(['/']);
    });

    it('permite reintentar si el guardado falla', async () => {
      service.create.mockReturnValue(throwError(() => new Error('500')));
      const { fixture, el, fill } = await setup();

      await fill('T', '', 'https://u.com');
      await submitForm(fixture);
      expect(el.querySelector<HTMLButtonElement>('button[type="submit"]')?.disabled).toBe(false);

      await submitForm(fixture);
      expect(service.create).toHaveBeenCalledTimes(2);
    });

    it('muestra en cada campo los errores de validación que devuelve la API', async () => {
      service.create.mockReturnValue(
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
      service.create.mockReturnValue(
        throwError(
          () =>
            new HttpErrorResponse({ status: 500, error: { message: 'Error interno del servidor' } }),
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
      service.create.mockReturnValue(throwError(() => new Error('500')));
      const { fixture, el, fill, navigate } = await setup();

      await fill('T', 'D', 'https://u.com');
      await submitForm(fixture);

      expect(el.querySelector('p.error')?.textContent).toBe('Error al guardar el favorito.');
      expect(navigate).not.toHaveBeenCalled();
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('edición', () => {
    it('carga el favorito en el formulario', async () => {
      service.get.mockReturnValue(of({ bookmark }));
      const { el } = await setup('1');

      expect(service.get).toHaveBeenCalledWith('1');
      expect(el.querySelector('h1')?.textContent).toBe('Editar favorito');
      expect(el.querySelector<HTMLInputElement>('#title')?.value).toBe('Angular');
      expect(el.querySelector<HTMLTextAreaElement>('#description')?.value).toBe('Framework web');
      expect(el.querySelector<HTMLInputElement>('#url')?.value).toBe('https://angular.dev');
    });

    it('redirige al inicio si el favorito no existe', async () => {
      service.get.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 404 })));
      const { navigate } = await setup('1');

      expect(navigate).toHaveBeenCalledWith(['/']);
      expect(console.error).toHaveBeenCalled();
    });

    it('bloquea el formulario mientras carga el favorito', async () => {
      const respuesta = new Subject<BookmarkResponse>();
      service.get.mockReturnValue(respuesta);
      const { fixture, el } = await setup('1', { pending: true });

      expect(el.querySelector<HTMLInputElement>('#title')?.disabled).toBe(true);
      expect(el.querySelector<HTMLButtonElement>('button[type="submit"]')?.disabled).toBe(true);

      respuesta.next({ bookmark });
      respuesta.complete();
      await fixture.whenStable();

      expect(el.querySelector<HTMLInputElement>('#title')?.disabled).toBe(false);
      expect(el.querySelector<HTMLInputElement>('#title')?.value).toBe('Angular');
    });

    it('muestra un error, no permite enviar y deja reintentar si la carga falla', async () => {
      service.get
        .mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 500 })))
        .mockReturnValueOnce(of({ bookmark }));
      const { fixture, el, navigate } = await setup('1');

      expect(navigate).not.toHaveBeenCalled();
      expect(el.querySelector('p.error')?.textContent).toContain('No se pudo cargar el favorito.');
      await submitForm(fixture);
      expect(service.update).not.toHaveBeenCalled();

      el.querySelector<HTMLButtonElement>('p.error button')!.click();
      await fixture.whenStable();

      expect(service.get).toHaveBeenCalledTimes(2);
      expect(el.querySelector('p.error')).toBeNull();
      expect(el.querySelector<HTMLInputElement>('#title')?.value).toBe('Angular');
    });

    it('no redirige si la carga falla después de salir de la página', async () => {
      const respuesta = new Subject<BookmarkResponse>();
      service.get.mockReturnValue(respuesta);
      const { fixture, navigate } = await setup('1', { pending: true });

      fixture.destroy();
      respuesta.error(new Error('404'));

      expect(navigate).not.toHaveBeenCalled();
    });

    it('no envía y muestra errores si se vacía un campo obligatorio', async () => {
      service.get.mockReturnValue(of({ bookmark }));
      const { fixture, navigate, fieldErrors } = await setup('1');

      await fillInput(fixture, '#title', '');
      await submitForm(fixture);

      expect(service.update).not.toHaveBeenCalled();
      expect(navigate).not.toHaveBeenCalled();
      expect(fieldErrors()).toEqual(['¡El título es obligatorio!']);
    });

    it('envía los cambios y navega al inicio', async () => {
      service.get.mockReturnValue(of({ bookmark }));
      service.update.mockReturnValue(of({ bookmark: { ...bookmark, title: 'Nuevo' } }));
      const { fixture, navigate } = await setup('1');

      await fillInput(fixture, '#title', 'Nuevo');
      await submitForm(fixture);

      expect(service.update).toHaveBeenCalledWith('1', {
        title: 'Nuevo',
        description: 'Framework web',
        url: 'https://angular.dev',
      });
      expect(service.create).not.toHaveBeenCalled();
      expect(navigate).toHaveBeenCalledWith(['/']);
    });

    it('muestra un error si falla la actualización', async () => {
      service.get.mockReturnValue(of({ bookmark }));
      service.update.mockReturnValue(throwError(() => new Error('500')));
      const { fixture, el, navigate } = await setup('1');

      await submitForm(fixture);

      expect(el.querySelector('p.error')?.textContent).toBe('Error al actualizar el favorito.');
      expect(navigate).not.toHaveBeenCalled();
    });

    it('permite dejar la descripción vacía', async () => {
      service.get.mockReturnValue(of({ bookmark }));
      service.update.mockReturnValue(of({ bookmark: { ...bookmark, description: '' } }));
      const { fixture, navigate } = await setup('1');

      await fillInput(fixture, '#description', '   ');
      await submitForm(fixture);

      expect(service.update).toHaveBeenCalledWith('1', {
        title: 'Angular',
        description: '',
        url: 'https://angular.dev',
      });
      expect(navigate).toHaveBeenCalledWith(['/']);
    });

    it('no envía una URL inválida', async () => {
      service.get.mockReturnValue(of({ bookmark }));
      const { fixture, fieldErrors } = await setup('1');

      await fillInput(fixture, '#url', 'javascript:alert(1)');
      await submitForm(fixture);

      expect(service.update).not.toHaveBeenCalled();
      expect(fieldErrors()).toEqual(['¡La URL debe empezar con http:// o https://!']);
    });

    it('muestra en el campo el error de validación de la API', async () => {
      service.get.mockReturnValue(of({ bookmark }));
      service.update.mockReturnValue(
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
      const { fixture, el, fieldErrors } = await setup('1');

      await submitForm(fixture);

      expect(el.querySelector('p.error')?.textContent).toBe(
        'Error al actualizar el favorito. Revisa los campos marcados.',
      );
      expect(fieldErrors()).toEqual(['La URL no es válida']);
    });

    it('muestra el mensaje de la API si el favorito ya no existe', async () => {
      service.get.mockReturnValue(of({ bookmark }));
      service.update.mockReturnValue(
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
});
