/** Datos que se envían a la API al crear o editar un favorito. */
export interface NuevoFavorito {
  title: string;
  description: string;
  url: string;
}

export interface Favorito extends NuevoFavorito {
  id: string;
}

/** Respuestas de la API RESTful de favoritos. */
export interface FavoritosResponse {
  favoritos: Favorito[];
}

export interface FavoritoResponse {
  favorito: Favorito;
}
