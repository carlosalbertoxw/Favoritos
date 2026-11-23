import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';

import { BookmarkService } from '../services/bookmark.service';
import { Bookmark } from '../models/bookmark';

export const PAGE_SIZE = 20;

@Component({
  selector: 'app-bookmark-list',
  imports: [RouterLink],
  templateUrl: './bookmark-list.html',
  styleUrl: './bookmark-list.css',
})
export class BookmarkList implements OnInit {
  private readonly bookmarkService = inject(BookmarkService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly bookmarks = signal<Bookmark[]>([]);
  protected readonly loading = signal(true);
  protected readonly hasMore = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly confirmingId = signal<string | null>(null);

  ngOnInit(): void {
    this.onLoadMore();
  }

  onAskDelete(id: string): void {
    this.confirmingId.set(id);
  }

  onCancelDelete(): void {
    this.confirmingId.set(null);
  }

  onDelete(id: string): void {
    this.error.set(null);
    this.bookmarkService.delete(id).subscribe({
      next: () => {
        this.confirmingId.set(null);
        this.bookmarks.update((bookmarks) => bookmarks.filter((bookmark) => bookmark.id !== id));
      },
      error: (err) => {
        this.error.set('Error al eliminar el favorito.');
        console.error(err);
      },
    });
  }

  /** Pide la siguiente página; `skip` es lo ya cargado, así que borrar no desfasa la paginación. */
  onLoadMore(): void {
    this.loading.set(true);
    this.error.set(null);
    this.bookmarkService
      .list(this.bookmarks().length, PAGE_SIZE)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ bookmarks, hasMore }) => {
          this.bookmarks.update((current) => [...current, ...bookmarks]);
          this.hasMore.set(hasMore);
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
