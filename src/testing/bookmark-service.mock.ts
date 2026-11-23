import { Mocked } from 'vitest';

import { BookmarkService } from '../app/services/bookmark.service';

export type BookmarkServiceMock = Mocked<
  Pick<
    BookmarkService,
    'list' | 'get' | 'create' | 'update' | 'delete'
  >
>;

/** Crea un doble de `BookmarkService` con todos sus métodos espiados. */
export function createBookmarkServiceMock(): BookmarkServiceMock {
  return {
    list: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };
}
