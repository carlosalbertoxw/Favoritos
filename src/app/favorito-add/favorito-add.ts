import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { FavoritoService } from '../services/favorito.service';

@Component({
  selector: 'app-favorito-add',
  imports: [ReactiveFormsModule],
  templateUrl: './favorito-add.html',
  styleUrl: './favorito-add.css',
})
export class FavoritoAdd {
  private readonly fb = inject(FormBuilder);
  private readonly favoritoService = inject(FavoritoService);
  private readonly router = inject(Router);

  protected readonly titleSection = 'Agregar favorito';
  protected readonly error = signal<string | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    title: ['', Validators.required],
    description: ['', Validators.required],
    url: ['', Validators.required],
  });

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.favoritoService.addFavorito(this.form.getRawValue()).subscribe({
      next: () => this.router.navigate(['/']),
      error: (err) => {
        this.error.set('Error al guardar el favorito.');
        console.error(err);
      },
    });
  }
}
