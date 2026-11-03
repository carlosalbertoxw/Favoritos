import { Component, DestroyRef, OnInit, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { FormBuilder } from '@angular/forms';

import { FavoritoService } from '../services/favorito.service';
import { FavoritoForm } from '../favorito-form/favorito-form';
import {
  applyApiErrors,
  createFavoritoForm,
  describeSaveError,
  toFavorito,
} from '../favorito-form/favorito-form.validators';

/** Página de alta (`/agregar-favorito`) y de edición (`/editar-favorito/:id`). */
@Component({
  selector: 'app-favorito-editor',
  imports: [FavoritoForm],
  templateUrl: './favorito-editor.html',
})
export class FavoritoEditor implements OnInit {
  private readonly favoritoService = inject(FavoritoService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  /** Parámetro de la ruta de edición; en la ruta de alta no existe. */
  readonly id = input<string>();

  protected readonly titleSection = computed(() =>
    this.id() ? 'Editar favorito' : 'Agregar favorito',
  );
  protected readonly error = signal<string | null>(null);
  protected readonly saving = signal(false);
  protected readonly form = createFavoritoForm(inject(FormBuilder));

  ngOnInit(): void {
    const id = this.id();
    if (!id) {
      return;
    }

    this.favoritoService
      .getFavorito(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ favorito }) => this.form.patchValue(favorito),
        error: (err) => {
          console.error(err);
          this.router.navigate(['/']);
        },
      });
  }

  onSubmit(): void {
    if (this.saving()) {
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const id = this.id();
    const favorito = toFavorito(this.form);
    const save$ = id
      ? this.favoritoService.editFavorito(id, favorito)
      : this.favoritoService.addFavorito(favorito);

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
