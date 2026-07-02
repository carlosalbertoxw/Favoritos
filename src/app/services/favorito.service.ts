import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import {
  Favorito,
  FavoritoResponse,
  FavoritosResponse,
  MessageResponse,
} from '../models/favorito';

@Injectable({ providedIn: 'root' })
export class FavoritoService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  getFavoritos(): Observable<FavoritosResponse> {
    return this.http.get<FavoritosResponse>(`${this.baseUrl}/favoritos`);
  }

  getFavorito(id: string): Observable<FavoritoResponse> {
    return this.http.get<FavoritoResponse>(`${this.baseUrl}/favorito/${id}`);
  }

  addFavorito(favorito: Favorito): Observable<FavoritoResponse> {
    return this.http.post<FavoritoResponse>(`${this.baseUrl}/favorito`, favorito);
  }

  editFavorito(id: string, favorito: Favorito): Observable<FavoritoResponse> {
    return this.http.put<FavoritoResponse>(`${this.baseUrl}/favorito/${id}`, favorito);
  }

  deleteFavorito(id: string): Observable<MessageResponse> {
    return this.http.delete<MessageResponse>(`${this.baseUrl}/favorito/${id}`);
  }
}
