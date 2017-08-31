import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute, Params } from '@angular/router';

import {FavoritoService} from '../services/favorito.service';
import {Favorito} from '../models/favorito';

@Component({
  selector: 'app-favoritos-list',
  templateUrl: './favoritos-list.component.html',
  styleUrls: ['./favoritos-list.component.css'],
  providers: [FavoritoService]
})
export class FavoritosListComponent implements OnInit {
	public title:string;
	public favoritos:Favorito[];
	public errorMessage;
	public loading:boolean;
	public confirmado;

	constructor(private _favoritoService:FavoritoService) { 
		this.title = 'Lista de marcadores favoritos';
		this.loading = true;
	}

	ngOnInit() {
		this.getFavoritos();
  	}

  	onBorrarConfirm(id){
  		this.confirmado = id;
  	}

  	getFavoritos(){
  		this._favoritoService.getFavoritos().subscribe(
			result => {
				console.log(result);
				this.favoritos = result.favoritos;
				if(!this.favoritos){
					alert('Error en el servidor');
				}else{
					this.loading=false;
				}
			},
			error => {
				this.errorMessage = <any>error;
				if(this.errorMessage!=null){
					console.log(this.errorMessage);
					alert('Error en la petición');
				}
			}
		);
  	}

  	onBorrarFavorito(id){
  		this._favoritoService.deleteFavorito(id).subscribe(
			result => {
				if(!result.message){
					alert('Error en el servidor');
				}else{
					this.getFavoritos();
				}
			},
			error => {
				this.errorMessage = <any>error;
				if(this.errorMessage!=null){
					console.log(this.errorMessage);
					alert('Error en la petición');
				}
			}
		);
  	}

  	onCancelarConfirm(id){
  		this.confirmado = null;
  	}
}
