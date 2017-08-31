/* tslint:disable:no-unused-variable */

import { TestBed, async, inject } from '@angular/core/testing';
import { FavoritoService } from './favorito.service';

describe('FavoritoService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [FavoritoService]
    });
  });

  it('should ...', inject([FavoritoService], (service: FavoritoService) => {
    expect(service).toBeTruthy();
  }));
});
