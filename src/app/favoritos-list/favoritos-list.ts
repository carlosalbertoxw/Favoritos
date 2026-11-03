import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';

import { FavoritoService } from '../services/favorito.service';
import { Favorito } from '../models/favorito';

export const FAVORITOS_POR_PAGINA = 20;

@Component({
  selector: 'app-favoritos-list',
  imports: [RouterLink],
  templateUrl: './favoritos-list.html',
  styleUrl: './favoritos-list.css',
})
export class FavoritosList implements OnInit {
  private readonly favoritoService = inject(FavoritoService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly title = 'Lista de marcadores favoritos';
  protected readonly favoritos = signal<Favorito[]>([]);
  protected readonly loading = signal(true);
  protected readonly hayMas = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly confirmado = signal<string | null>(null);

  ngOnInit(): void {
    this.onCargarMas();
  }

  onBorrarConfirm(id: string): void {
    this.confirmado.set(id);
  }

  onCancelarConfirm(): void {
    this.confirmado.set(null);
  }

  onBorrarFavorito(id: string): void {
    this.error.set(null);
    this.favoritoService.deleteFavorito(id).subscribe({
      next: () => {
        this.confirmado.set(null);
        this.favoritos.update((favoritos) => favoritos.filter((favorito) => favorito.id !== id));
      },
      error: (err) => {
        this.error.set('Error al eliminar el favorito.');
        console.error(err);
      },
    });
  }

  /** Pide la siguiente página; `skip` es lo ya cargado, así que borrar no desfasa la paginación. */
  onCargarMas(): void {
    this.loading.set(true);
    this.error.set(null);
    this.favoritoService
      .getFavoritos(this.favoritos().length, FAVORITOS_POR_PAGINA)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ favoritos }) => {
          this.favoritos.update((actuales) => [...actuales, ...favoritos]);
          this.hayMas.set(favoritos.length === FAVORITOS_POR_PAGINA);
          this.loading.set(false);
        },
        error: (err) => {
          this.error.set('Error al cargar los favoritos.');
          this.loading.set(false);
          console.error(err);
        },
      });
  }
}
