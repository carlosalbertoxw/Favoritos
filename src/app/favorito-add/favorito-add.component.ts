import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute, Params } from '@angular/router';

import {FavoritoService} from '../services/favorito.service';
import {Favorito} from '../models/favorito';

@Component({
  selector: 'app-favorito-add',
  templateUrl: './favorito-add.component.html',
  styleUrls: ['./favorito-add.component.css'],
  providers: [FavoritoService]
})

export class FavoritoAddComponent implements OnInit {
	public titleSection:string;
	public favorito:Favorito;
  public errorMessage;

  	constructor(
      private _favoritoService:FavoritoService,
      private _route:ActivatedRoute,
      private _router: Router
    ) {
  		this.titleSection = 'Agregar favorito';
  	}

  	ngOnInit() {
  		this.favorito = new Favorito("","","","");
  	}

    onSubmit(){
      this._favoritoService.addFavorito(this.favorito).subscribe(
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
    }

}
