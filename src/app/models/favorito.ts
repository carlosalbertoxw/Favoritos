export interface Favorito {
  id?: string;
  title: string;
  description: string;
  url: string;
}

/** Respuestas de la API RESTful de favoritos. */
export interface FavoritosResponse {
  favoritos: Favorito[];
}

export interface FavoritoResponse {
  favorito: Favorito;
}

export interface MessageResponse {
  message: string;
}
