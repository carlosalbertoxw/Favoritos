import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable } from 'rxjs';

import { BookmarkResponse, BookmarksResponse, NewBookmark } from '../models/bookmark';

/**
 * Ruta relativa: en producción nginx reenvía /api/ a la API y, en desarrollo,
 * lo hace el proxy de `ng serve` (proxy.conf.json). Así todo se sirve desde el mismo origen.
 */
export const BOOKMARKS_API = '/api/v1/bookmarks';

/**
 * `true` si el error es un 404 de la API. Acepta también el error de un `resource`,
 * que envuelve en `cause` lo que no es un `Error` (como `HttpErrorResponse`).
 */
export function isNotFound(error: unknown): boolean {
  const cause = error instanceof Error && error.cause !== undefined ? error.cause : error;
  return cause instanceof HttpErrorResponse && cause.status === 404;
}

@Injectable({ providedIn: 'root' })
export class BookmarkService {
  private readonly http = inject(HttpClient);

  list(skip: number, limit: number): Observable<BookmarksResponse> {
    return this.http.get<BookmarksResponse>(BOOKMARKS_API, { params: { skip, limit } });
  }

  get(id: string): Observable<BookmarkResponse> {
    return this.http.get<BookmarkResponse>(this.bookmarkUrl(id));
  }

  create(bookmark: NewBookmark): Observable<BookmarkResponse> {
    return this.http.post<BookmarkResponse>(BOOKMARKS_API, bookmark);
  }

  update(id: string, bookmark: NewBookmark): Observable<BookmarkResponse> {
    return this.http.patch<BookmarkResponse>(this.bookmarkUrl(id), bookmark);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(this.bookmarkUrl(id));
  }

  /** El id viene de la URL de la app: se codifica para que no pueda alterar la ruta de la API (p. ej. `../`). */
  private bookmarkUrl(id: string): string {
    return `${BOOKMARKS_API}/${encodeURIComponent(id)}`;
  }
}
