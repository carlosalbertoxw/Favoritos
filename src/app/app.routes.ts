import { Routes } from '@angular/router';

import { FavoritosList } from './favoritos-list/favoritos-list';
import { FavoritoDetail } from './favorito-detail/favorito-detail';
import { FavoritoAdd } from './favorito-add/favorito-add';
import { FavoritoEdit } from './favorito-edit/favorito-edit';

export const routes: Routes = [
  { path: '', component: FavoritosList },
  { path: 'favorito/:id', component: FavoritoDetail },
  { path: 'agregar-favorito', component: FavoritoAdd },
  { path: 'editar-favorito/:id', component: FavoritoEdit },
  { path: '**', redirectTo: '' },
];
