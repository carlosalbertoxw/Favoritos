import { Component, computed, effect, inject, input } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';

import { BookmarkService, isNotFound } from '../services/bookmark.service';

@Component({
  selector: 'app-bookmark-detail',
  templateUrl: './bookmark-detail.html',
  styleUrl: './bookmark-detail.css',
})
export class BookmarkDetail {
  private readonly bookmarkService = inject(BookmarkService);
  private readonly router = inject(Router);

  readonly id = input.required<string>();

  /** Se vuelve a pedir solo si cambia el id; la petición se cancela al salir de la página. */
  protected readonly resource = rxResource({
    params: () => this.id(),
    stream: ({ params: id }) => this.bookmarkService.get(id),
  });

  protected readonly bookmark = computed(() =>
    this.resource.hasValue() ? this.resource.value().bookmark : undefined,
  );

  /** Fallo distinto de "no existe": se muestra un mensaje con la opción de reintentar. */
  protected readonly loadFailed = computed(() => {
    const error = this.resource.error();
    return error !== undefined && !isNotFound(error);
  });

  constructor() {
    effect(() => {
      const error = this.resource.error();
      if (error) {
        console.error(error);
        // Un favorito que no existe lleva al listado.
        if (isNotFound(error)) {
          this.router.navigate(['/']);
        }
      }
    });
  }
}
