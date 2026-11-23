import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { FormBuilder } from '@angular/forms';

import { BookmarkService, isNotFound } from '../services/bookmark.service';
import { BookmarkForm } from '../bookmark-form/bookmark-form';
import {
  applyApiErrors,
  createBookmarkForm,
  describeSaveError,
  toBookmark,
} from '../bookmark-form/bookmark-form.validators';

/** Página de alta (`/agregar-favorito`) y de edición (`/editar-favorito/:id`). */
@Component({
  selector: 'app-bookmark-editor',
  imports: [BookmarkForm],
  templateUrl: './bookmark-editor.html',
})
export class BookmarkEditor {
  private readonly bookmarkService = inject(BookmarkService);
  private readonly router = inject(Router);

  /** Parámetro de la ruta de edición; en la ruta de alta no existe. */
  readonly id = input<string>();

  protected readonly heading = computed(() =>
    this.id() ? 'Editar favorito' : 'Agregar favorito',
  );
  protected readonly error = signal<string | null>(null);
  protected readonly saving = signal(false);
  protected readonly form = createBookmarkForm(inject(FormBuilder));

  /** En la ruta de alta no hay id: el recurso queda inactivo y no hace ninguna petición. */
  protected readonly resource = rxResource({
    params: () => this.id(),
    stream: ({ params: id }) => this.bookmarkService.get(id),
  });

  /** Fallo distinto de "no existe": se muestra un mensaje con la opción de reintentar. */
  protected readonly loadFailed = computed(() => {
    const error = this.resource.error();
    return error !== undefined && !isNotFound(error);
  });

  /** El formulario no se puede editar ni enviar hasta tener el favorito. */
  protected readonly blocked = computed(() => this.resource.isLoading() || this.loadFailed());

  constructor() {
    effect(() => {
      if (this.resource.hasValue()) {
        this.form.patchValue(this.resource.value().bookmark);
      }
    });

    effect(() => {
      if (this.blocked()) {
        this.form.disable();
      } else {
        this.form.enable();
      }
    });

    effect(() => {
      const error = this.resource.error();
      if (error) {
        console.error(error);
        // Un favorito que no existe lleva al listado.
        if (isNotFound(error)) {
          this.router.navigate(['/']);
        }
      }
    });
  }

  onSubmit(): void {
    if (this.saving() || this.blocked()) {
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const id = this.id();
    const bookmark = toBookmark(this.form);
    const save$ = id
      ? this.bookmarkService.update(id, bookmark)
      : this.bookmarkService.create(bookmark);

    this.error.set(null);
    this.saving.set(true);
    save$.subscribe({
      next: () => this.router.navigate(['/']),
      error: (err) => {
        this.saving.set(false);
        const fallback = id ? 'Error al actualizar el favorito.' : 'Error al guardar el favorito.';
        const fieldErrors = applyApiErrors(this.form, err);
        this.error.set(describeSaveError(fallback, err, fieldErrors));
        console.error(err);
      },
    });
  }
}
