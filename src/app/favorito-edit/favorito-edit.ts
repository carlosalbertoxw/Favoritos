import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { FavoritoService } from '../services/favorito.service';

@Component({
  selector: 'app-favorito-edit',
  imports: [ReactiveFormsModule],
  templateUrl: './favorito-edit.html',
  styleUrl: './favorito-edit.css',
})
export class FavoritoEdit implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly favoritoService = inject(FavoritoService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly titleSection = 'Editar favorito';
  protected readonly error = signal<string | null>(null);

  private id: string | null = null;

  protected readonly form = this.fb.nonNullable.group({
    title: ['', Validators.required],
    description: ['', Validators.required],
    url: ['', Validators.required],
  });

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

    this.favoritoService.editFavorito(this.id, this.form.getRawValue()).subscribe({
      next: () => this.router.navigate(['/']),
      error: (err) => {
        this.error.set('Error al actualizar el favorito.');
        console.error(err);
      },
    });
  }
}
