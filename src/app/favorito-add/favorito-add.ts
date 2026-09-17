import { Component, inject, signal } from '@angular/core';
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

@Component({
  selector: 'app-favorito-add',
  imports: [FavoritoForm],
  templateUrl: './favorito-add.html',
  styleUrl: './favorito-add.css',
})
export class FavoritoAdd {
  private readonly favoritoService = inject(FavoritoService);
  private readonly router = inject(Router);

  protected readonly titleSection = 'Agregar favorito';
  protected readonly error = signal<string | null>(null);
  protected readonly form = createFavoritoForm(inject(FormBuilder));

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.error.set(null);
    this.favoritoService.addFavorito(toFavorito(this.form)).subscribe({
      next: () => this.router.navigate(['/']),
      error: (err) => {
        const fieldErrors = applyApiErrors(this.form, err);
        this.error.set(describeSaveError('Error al guardar el favorito.', err, fieldErrors));
        console.error(err);
      },
    });
  }
}
