import { Component, input, output } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';

import {
  BOOKMARK_ERROR_MESSAGES,
  BOOKMARK_LIMITS,
  BookmarkFormGroup,
} from './bookmark-form.validators';

type Campo = keyof BookmarkFormGroup['controls'];

/** Campos, validaciones y mensajes compartidos por el alta y la edición de favoritos. */
@Component({
  selector: 'app-bookmark-form',
  imports: [ReactiveFormsModule],
  templateUrl: './bookmark-form.html',
  styleUrl: './bookmark-form.css',
})
export class BookmarkForm {
  readonly form = input.required<BookmarkFormGroup>();
  readonly submitLabel = input.required<string>();
  readonly saving = input(false);
  readonly submitted = output<void>();

  protected readonly limits = BOOKMARK_LIMITS;

  /** Primer mensaje de error del campo, solo si el usuario ya interactuó con él. */
  protected errorFor(campo: Campo): string | null {
    const control = this.form().controls[campo];
    if (!control.touched || !control.errors) {
      return null;
    }
    const [key, value] = Object.entries(control.errors)[0];
    return key === 'api' ? String(value) : (BOOKMARK_ERROR_MESSAGES[campo]?.[key] ?? null);
  }
}
