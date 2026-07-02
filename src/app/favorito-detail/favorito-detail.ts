import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { FavoritoService } from '../services/favorito.service';
import { Favorito } from '../models/favorito';

@Component({
  selector: 'app-favorito-detail',
  templateUrl: './favorito-detail.html',
  styleUrl: './favorito-detail.css',
})
export class FavoritoDetail implements OnInit {
  private readonly favoritoService = inject(FavoritoService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly favorito = signal<Favorito | null>(null);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.router.navigate(['/']);
      return;
    }

    this.favoritoService.getFavorito(id).subscribe({
      next: (res) => {
        if (res.favorito) {
          this.favorito.set(res.favorito);
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
}
