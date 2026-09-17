import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, FormControl } from '@angular/forms';

import {
  FAVORITO_LIMITS,
  applyApiErrors,
  createFavoritoForm,
  describeSaveError,
  httpUrl,
  maxLengthTrimmed,
  requiredTrimmed,
  toFavorito,
} from './favorito-form.validators';

describe('favorito-form.validators', () => {
  const validate = (validator: ReturnType<typeof httpUrl>, value: string) =>
    validator(new FormControl(value));

  describe('requiredTrimmed', () => {
    it.each(['', '   ', '\n\t'])('marca %j como obligatorio', (value) => {
      expect(validate(requiredTrimmed(), value)).toEqual({ required: true });
    });

    it('acepta texto con contenido', () => {
      expect(validate(requiredTrimmed(), ' a ')).toBeNull();
    });
  });

  describe('maxLengthTrimmed', () => {
    it('acepta el límite exacto', () => {
      expect(validate(maxLengthTrimmed(5), 'abcde')).toBeNull();
    });

    it('no cuenta los espacios al inicio ni al final', () => {
      expect(validate(maxLengthTrimmed(5), '  abcde  ')).toBeNull();
    });

    it('rechaza textos que superan el límite', () => {
      expect(validate(maxLengthTrimmed(5), 'abcdef')).toEqual({
        maxlength: { requiredLength: 5, actualLength: 6 },
      });
    });
  });

  describe('httpUrl', () => {
    // Casos comparados contra el esquema de validación de Api-restful-favoritos.
    it.each([
      'https://angular.dev',
      'HTTPS://A.COM',
      'http://localhost',
      'http://[::1]:8080',
      'https://ex.com/path?q=1#h',
      '  https://a.com  ',
    ])('acepta %j', (value) => {
      expect(validate(httpUrl(), value)).toBeNull();
    });

    it.each([
      'docs.docker.com',
      'www.google.com',
      'javascript:alert(1)',
      'JAVASCRIPT:alert(1)',
      'data:text/html,x',
      'mailto:a@b.com',
      'ftp://x.com',
      'file:///c:/x',
      'https:/x',
      'http:x.com',
      'http:\\\\a.com',
    ])('rechaza %j porque no empieza con http:// o https://', (value) => {
      expect(validate(httpUrl(), value)).toEqual({ protocol: true });
    });

    it.each(['http://', 'https://', 'http://?', 'http://a b.com', 'http://%zz', 'http://localhost:99999'])(
      'rechaza %j por no ser una URL válida',
      (value) => {
        expect(validate(httpUrl(), value)).toEqual({ url: true });
      },
    );

    it('deja el valor vacío a requiredTrimmed', () => {
      expect(validate(httpUrl(), '')).toBeNull();
    });
  });

  describe('createFavoritoForm', () => {
    const create = () => TestBed.runInInjectionContext(() => createFavoritoForm(new FormBuilder()));

    it('es válido con título y URL, y descripción opcional', () => {
      const form = create();
      form.setValue({ title: 'T', description: '', url: 'https://a.com' });
      expect(form.valid).toBe(true);
    });

    it('aplica los límites de la API', () => {
      const form = create();
      form.setValue({
        title: 'a'.repeat(FAVORITO_LIMITS.title + 1),
        description: 'a'.repeat(FAVORITO_LIMITS.description + 1),
        url: 'https://a.com',
      });
      expect(form.controls.title.hasError('maxlength')).toBe(true);
      expect(form.controls.description.hasError('maxlength')).toBe(true);
    });

    it('toFavorito recorta los espacios', () => {
      const form = create();
      form.setValue({ title: ' T ', description: ' D ', url: ' https://a.com ' });
      expect(toFavorito(form)).toEqual({ title: 'T', description: 'D', url: 'https://a.com' });
    });
  });

  describe('applyApiErrors', () => {
    const create = () => createFavoritoForm(new FormBuilder());
    const badRequest = (errors: unknown) =>
      new HttpErrorResponse({ status: 400, error: { message: 'Datos inválidos', errors } });

    it('marca los campos indicados por la API', () => {
      const form = create();
      const applied = applyApiErrors(
        form,
        badRequest([{ path: 'url', message: 'La URL no es válida' }]),
      );

      expect(applied).toBe(true);
      expect(form.controls.url.errors).toEqual({ api: 'La URL no es válida' });
      expect(form.controls.url.touched).toBe(true);
      expect(form.controls.title.hasError('api')).toBe(false);
      expect(form.controls.title.touched).toBe(false);
    });

    it('ignora rutas que no son campos del formulario', () => {
      const form = create();
      expect(applyApiErrors(form, badRequest([{ path: '', message: 'Id inválido' }]))).toBe(false);
    });

    it('ignora errores que no son 400 o no traen la lista de errores', () => {
      const form = create();
      expect(applyApiErrors(form, new Error('boom'))).toBe(false);
      expect(applyApiErrors(form, new HttpErrorResponse({ status: 500 }))).toBe(false);
      expect(applyApiErrors(form, badRequest(undefined))).toBe(false);
    });
  });

  describe('describeSaveError', () => {
    it('pide revisar los campos cuando hay errores por campo', () => {
      expect(describeSaveError('Error.', new Error(), true)).toBe('Error. Revisa los campos marcados.');
    });

    it('agrega el mensaje de la API cuando existe', () => {
      const err = new HttpErrorResponse({ status: 404, error: { message: 'No existe el marcador' } });
      expect(describeSaveError('Error.', err, false)).toBe('Error. No existe el marcador.');
    });

    it('usa solo el mensaje base si no hay detalle', () => {
      expect(describeSaveError('Error.', new Error('boom'), false)).toBe('Error.');
      expect(describeSaveError('Error.', new HttpErrorResponse({ status: 0 }), false)).toBe('Error.');
    });
  });
});
