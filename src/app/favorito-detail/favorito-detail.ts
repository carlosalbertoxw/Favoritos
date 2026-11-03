import { Component, DestroyRef, OnInit, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';

import { FavoritoService } from '../services/favorito.service';
import { Favorito } from '../models/favorito';

@Component({
  selector: 'app-favorito-detail',
  templateUrl: './favorito-detail.html',
  styleUrl: './favorito-detail.css',
})
export class FavoritoDetail implements OnInit {
  private readonly favoritoService = inject(FavoritoService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly id = input.required<string>();

  protected readonly favorito = signal<Favorito | null>(null);

  ngOnInit(): void {
    this.favoritoService
      .getFavorito(this.id())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ favorito }) => this.favorito.set(favorito),
        error: (err) => {
          console.error(err);
          this.router.navigate(['/']);
        },
      });
  }
}
