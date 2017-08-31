import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  public title:string;
  public description:string;

  constructor() {
  	this.title = 'Favoritos';
  	this.description = 'Marcadores favoritos';
  }
}
