import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { FavoritoService } from '../services/favorito.service';
import { Favorito } from '../models/favorito';

@Component({
  selector: 'app-favoritos-list',
  imports: [RouterLink],
  templateUrl: './favoritos-list.html',
  styleUrl: './favoritos-list.css',
})
export class FavoritosList implements OnInit {
  private readonly favoritoService = inject(FavoritoService);

  protected readonly title = 'Lista de marcadores favoritos';
  protected readonly favoritos = signal<Favorito[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly confirmado = signal<string | null>(null);

  ngOnInit(): void {
    this.getFavoritos();
  }

  onBorrarConfirm(id: string): void {
    this.confirmado.set(id);
  }

  onCancelarConfirm(): void {
    this.confirmado.set(null);
  }

  onBorrarFavorito(id: string): void {
    this.favoritoService.deleteFavorito(id).subscribe({
      next: () => {
        this.confirmado.set(null);
        this.getFavoritos();
      },
      error: (err) => {
        this.error.set('Error al eliminar el favorito.');
        console.error(err);
      },
    });
  }

  private getFavoritos(): void {
    this.loading.set(true);
    this.error.set(null);
    this.favoritoService.getFavoritos().subscribe({
      next: (res) => {
        this.favoritos.set(res.favoritos ?? []);
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
