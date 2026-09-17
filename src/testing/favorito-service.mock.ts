import { Mocked } from 'vitest';

import { FavoritoService } from '../app/services/favorito.service';

export type FavoritoServiceMock = Mocked<
  Pick<
    FavoritoService,
    'getFavoritos' | 'getFavorito' | 'addFavorito' | 'editFavorito' | 'deleteFavorito'
  >
>;

/** Crea un doble de `FavoritoService` con todos sus métodos espiados. */
export function createFavoritoServiceMock(): FavoritoServiceMock {
  return {
    getFavoritos: vi.fn(),
    getFavorito: vi.fn(),
    addFavorito: vi.fn(),
    editFavorito: vi.fn(),
    deleteFavorito: vi.fn(),
  };
}
