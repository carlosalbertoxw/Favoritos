import { Routes } from '@angular/router';

import { BookmarkList } from './bookmark-list/bookmark-list';
import { BookmarkDetail } from './bookmark-detail/bookmark-detail';
import { BookmarkEditor } from './bookmark-editor/bookmark-editor';

export const routes: Routes = [
  { path: '', component: BookmarkList },
  { path: 'favorito/:id', component: BookmarkDetail },
  { path: 'agregar-favorito', component: BookmarkEditor },
  { path: 'editar-favorito/:id', component: BookmarkEditor },
  { path: '**', redirectTo: '' },
];
