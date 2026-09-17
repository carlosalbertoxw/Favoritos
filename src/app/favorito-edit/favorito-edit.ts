import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
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
  selector: 'app-favorito-edit',
  imports: [FavoritoForm],
  templateUrl: './favorito-edit.html',
  styleUrl: './favorito-edit.css',
})
export class FavoritoEdit implements OnInit {
  private readonly favoritoService = inject(FavoritoService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly titleSection = 'Editar favorito';
  protected readonly error = signal<string | null>(null);
  protected readonly form = createFavoritoForm(inject(FormBuilder));

  private id: string | null = null;

  ngOnInit(): void {
    this.id = this.route.snapshot.paramMap.get('id');
    if (!this.id) {
      this.router.navigate(['/']);
      return;
    }

    this.favoritoService.getFavorito(this.id).subscribe({
      next: (res) => {
        if (res.favorito) {
          this.form.patchValue(res.favorito);
        } else {
          this.router.navigate(['/']);
        }
      },
      error: (err) => {
        console.error(err);
        this.router.navigate(['/']);
      },
    });
  }

  onSubmit(): void {
    if (this.form.invalid || !this.id) {
      this.form.markAllAsTouched();
      return;
    }

    this.error.set(null);
    this.favoritoService.editFavorito(this.id, toFavorito(this.form)).subscribe({
      next: () => this.router.navigate(['/']),
      error: (err) => {
        const fieldErrors = applyApiErrors(this.form, err);
        this.error.set(describeSaveError('Error al actualizar el favorito.', err, fieldErrors));
        console.error(err);
      },
    });
  }
}
