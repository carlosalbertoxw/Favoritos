/** Datos que se envían a la API al crear o editar un favorito. */
export interface NewBookmark {
  title: string;
  description: string;
  url: string;
}

export interface Bookmark extends NewBookmark {
  id: string;
}

/** Respuestas de la API RESTful de favoritos (v1). */
export interface BookmarksResponse {
  bookmarks: Bookmark[];
  /** `true` si quedan más marcadores después de esta página. */
  hasMore: boolean;
}

export interface BookmarkResponse {
  bookmark: Bookmark;
}
