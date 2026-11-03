import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import {
  FavoritoResponse,
  FavoritosResponse,
  NuevoFavorito,
} from '../models/favorito';

@Injectable({ providedIn: 'root' })
export class FavoritoService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/favoritos`;

  getFavoritos(skip: number, limit: number): Observable<FavoritosResponse> {
    return this.http.get<FavoritosResponse>(this.baseUrl, { params: { skip, limit } });
  }

  getFavorito(id: string): Observable<FavoritoResponse> {
    return this.http.get<FavoritoResponse>(this.favoritoUrl(id));
  }

  addFavorito(favorito: NuevoFavorito): Observable<FavoritoResponse> {
    return this.http.post<FavoritoResponse>(this.baseUrl, favorito);
  }

  editFavorito(id: string, favorito: NuevoFavorito): Observable<FavoritoResponse> {
    return this.http.patch<FavoritoResponse>(this.favoritoUrl(id), favorito);
  }

  deleteFavorito(id: string): Observable<void> {
    return this.http.delete<void>(this.favoritoUrl(id));
  }

  /** El id viene de la URL de la app: se codifica para que no pueda alterar la ruta de la API (p. ej. `../`). */
  private favoritoUrl(id: string): string {
    return `${this.baseUrl}/${encodeURIComponent(id)}`;
  }
}
