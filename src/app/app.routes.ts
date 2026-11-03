import { Routes } from '@angular/router';

import { FavoritosList } from './favoritos-list/favoritos-list';
import { FavoritoDetail } from './favorito-detail/favorito-detail';
import { FavoritoEditor } from './favorito-editor/favorito-editor';

export const routes: Routes = [
  { path: '', component: FavoritosList },
  { path: 'favorito/:id', component: FavoritoDetail },
  { path: 'agregar-favorito', component: FavoritoEditor },
  { path: 'editar-favorito/:id', component: FavoritoEditor },
  { path: '**', redirectTo: '' },
];
