import { ModuleWithProviders } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { FavoritosListComponent } from './favoritos-list/favoritos-list.component';
import { FavoritoDetailComponent } from './favorito-detail/favorito-detail.component';
import { FavoritoAddComponent } from './favorito-add/favorito-add.component';
import { FavoritoEditComponent } from './favorito-edit/favorito-edit.component';

const appRoutes: Routes = [
	{path: '', component: FavoritosListComponent},
	{path: 'favorito/:id', component: FavoritoDetailComponent},
	{path: 'agregar-favorito', component: FavoritoAddComponent},
	{path: 'editar-favorito/:id', component: FavoritoEditComponent},
	{path: '**', component: FavoritosListComponent}
];

export const  appRoutingProviders: any[] = [];
export const  routing: ModuleWithProviders = RouterModule.forRoot(appRoutes);
