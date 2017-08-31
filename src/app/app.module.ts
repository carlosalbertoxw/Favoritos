import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpModule } from '@angular/http';
import {routing, appRoutingProviders} from './app.routing';

import { AppComponent } from './app.component';
import { FavoritosListComponent } from './favoritos-list/favoritos-list.component';
import { FavoritoDetailComponent } from './favorito-detail/favorito-detail.component';
import { FavoritoAddComponent } from './favorito-add/favorito-add.component';
import { FavoritoEditComponent } from './favorito-edit/favorito-edit.component';

@NgModule({
  declarations: [
    AppComponent,
    FavoritosListComponent,
    FavoritoDetailComponent,
    FavoritoAddComponent,
    FavoritoEditComponent
  ],
  imports: [
    BrowserModule,
    FormsModule,
    HttpModule,
    routing
  ],
  providers: [ appRoutingProviders ],
  bootstrap: [AppComponent]
})
export class AppModule { }
