import { HttpErrorResponse } from '@angular/common/http';
import { AbstractControl, FormBuilder, ValidationErrors, ValidatorFn } from '@angular/forms';

import { Favorito } from '../models/favorito';

/** Límites de longitud definidos por la API (se miden sin espacios al inicio ni al final). */
export const FAVORITO_LIMITS = {
  title: 200,
  description: 1000,
} as const;

/** Mensajes por campo y por clave de error. `api` usa el mensaje que devuelve la API. */
export const FAVORITO_ERROR_MESSAGES: Record<string, Record<string, string>> = {
  title: {
    required: '¡El título es obligatorio!',
    maxlength: `¡El título no puede tener más de ${FAVORITO_LIMITS.title} caracteres!`,
  },
  description: {
    maxlength: `¡La descripción no puede tener más de ${FAVORITO_LIMITS.description} caracteres!`,
  },
  url: {
    required: '¡La URL es obligatoria!',
    protocol: '¡La URL debe empezar con http:// o https://!',
    url: '¡La URL no es válida!',
  },
};

/** Misma regla que la API: el texto debe empezar literalmente con http:// o https://. */
const HTTP_URL_REGEX = /^https?:\/\//i;

const asTrimmed = (control: AbstractControl): string => String(control.value ?? '').trim();

/** Como `Validators.required`, pero considera vacío un texto con solo espacios. */
export function requiredTrimmed(): ValidatorFn {
  return (control) => (asTrimmed(control) === '' ? { required: true } : null);
}

/** Como `Validators.maxLength`, pero sin contar los espacios al inicio ni al final. */
export function maxLengthTrimmed(max: number): ValidatorFn {
  return (control): ValidationErrors | null => {
    const length = asTrimmed(control).length;
    return length > max ? { maxlength: { requiredLength: max, actualLength: length } } : null;
  };
}

/**
 * URL absoluta http(s), con las mismas reglas y en el mismo orden que la API:
 * primero `protocol` (debe empezar con http:// o https://) y después `url` (debe ser parseable).
 * Un valor vacío lo valida `requiredTrimmed`.
 */
export function httpUrl(): ValidatorFn {
  return (control) => {
    const value = asTrimmed(control);
    if (value === '') {
      return null;
    }
    if (!HTTP_URL_REGEX.test(value)) {
      return { protocol: true };
    }
    try {
      const { protocol, hostname } = new URL(value);
      return (protocol === 'http:' || protocol === 'https:') && hostname ? null : { url: true };
    } catch {
      return { url: true };
    }
  };
}

export function createFavoritoForm(fb: FormBuilder) {
  return fb.nonNullable.group({
    title: ['', [requiredTrimmed(), maxLengthTrimmed(FAVORITO_LIMITS.title)]],
    description: ['', maxLengthTrimmed(FAVORITO_LIMITS.description)],
    url: ['', [requiredTrimmed(), httpUrl()]],
  });
}

export type FavoritoFormGroup = ReturnType<typeof createFavoritoForm>;

/** Valores del formulario listos para enviar a la API. */
export function toFavorito(form: FavoritoFormGroup): Favorito {
  const { title, description, url } = form.getRawValue();
  return { title: title.trim(), description: description.trim(), url: url.trim() };
}

interface ApiValidationError {
  path: string;
  message: string;
}

/**
 * Traslada los errores de validación de la API (`400 { errors: [{ path, message }] }`)
 * a los controles del formulario. Devuelve `true` si marcó algún campo.
 */
export function applyApiErrors(form: FavoritoFormGroup, err: unknown): boolean {
  if (!(err instanceof HttpErrorResponse) || err.status !== 400) {
    return false;
  }
  const errors: ApiValidationError[] = Array.isArray(err.error?.errors) ? err.error.errors : [];
  let applied = false;
  for (const { path, message } of errors) {
    const control = form.get(path);
    if (control && path in form.controls) {
      control.setErrors({ api: message });
      control.markAsTouched();
      applied = true;
    }
  }
  return applied;
}

/** Mensaje general para un error al guardar, con el detalle que aporte la API. */
export function describeSaveError(fallback: string, err: unknown, fieldErrors: boolean): string {
  if (fieldErrors) {
    return `${fallback} Revisa los campos marcados.`;
  }
  const apiMessage = err instanceof HttpErrorResponse ? err.error?.message : undefined;
  return typeof apiMessage === 'string' && apiMessage ? `${fallback} ${apiMessage}.` : fallback;
}
