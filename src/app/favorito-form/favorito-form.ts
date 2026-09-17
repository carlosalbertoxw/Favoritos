import { Component, input, output } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';

import {
  FAVORITO_ERROR_MESSAGES,
  FAVORITO_LIMITS,
  FavoritoFormGroup,
} from './favorito-form.validators';

type Campo = keyof FavoritoFormGroup['controls'];

/** Campos, validaciones y mensajes compartidos por el alta y la edición de favoritos. */
@Component({
  selector: 'app-favorito-form',
  imports: [ReactiveFormsModule],
  templateUrl: './favorito-form.html',
  styleUrl: './favorito-form.css',
})
export class FavoritoForm {
  readonly form = input.required<FavoritoFormGroup>();
  readonly submitLabel = input.required<string>();
  readonly submitted = output<void>();

  protected readonly limits = FAVORITO_LIMITS;

  /** Primer mensaje de error del campo, solo si el usuario ya interactuó con él. */
  protected errorFor(campo: Campo): string | null {
    const control = this.form().controls[campo];
    if (!control.touched || !control.errors) {
      return null;
    }
    const [key, value] = Object.entries(control.errors)[0];
    return key === 'api' ? String(value) : (FAVORITO_ERROR_MESSAGES[campo]?.[key] ?? null);
  }
}
