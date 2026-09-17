import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('se crea', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('muestra el título, la descripción y los enlaces de navegación', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const el: HTMLElement = fixture.nativeElement;

    expect(el.querySelector('h1')?.textContent).toContain('Favoritos');
    expect(el.querySelector('.title-subtitle p')?.textContent).toContain('Marcadores favoritos');
    expect(el.querySelector('#header > a')?.getAttribute('href')).toBe('/');
    expect(el.querySelector('.btn-add-favorito')?.getAttribute('href')).toBe('/agregar-favorito');
    expect(el.querySelector('router-outlet')).not.toBeNull();
  });
});
