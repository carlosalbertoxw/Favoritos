import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute, Params } from '@angular/router';

import {FavoritoService} from '../services/favorito.service';
import {Favorito} from '../models/favorito';

@Component({
  selector: 'app-favorito-edit',
  templateUrl: './favorito-edit.component.html',
  styleUrls: ['./favorito-edit.component.css'],
  providers: [FavoritoService]
})
export class FavoritoEditComponent implements OnInit {

	public titleSection:string;
	public favorito:Favorito;
  	public errorMessage;

  	constructor(
      private _favoritoService:FavoritoService,
      private _route:ActivatedRoute,
      private _router: Router
    ) {
  		this.titleSection = 'Editar favorito';
  	}

  	ngOnInit() {
  		this.favorito = new Favorito("","","","");
  		this.getFavorito();
  	}

  	getFavorito(){
  		this._route.params.forEach((params:Params) => {
  			let id = params['id'];

  			this._favoritoService.getFavorito(id).subscribe(
  				response => {
  					if(!response.favorito){
  						this._router.navigate(['/']);
  					}else{
  						this.favorito = response.favorito;
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
  		});
  	}

    onSubmit(){
    	this._route.params.forEach((params:Params) => {
  			let id = params['id'];
	      	this._favoritoService.editFavorito(id, this.favorito).subscribe(
	        	response => {
	          		if(!response.favorito){
	            		alert('Error en el servidor');
	          		}else{
	            		this.favorito = response.favorito;
	            		this._router.navigate(['/']);
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
      	});
    }

}
