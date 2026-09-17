import { ComponentFixture } from '@angular/core/testing';

/** Escribe un valor en un input/textarea y espera a que Angular se estabilice. */
export async function fillInput(
  fixture: ComponentFixture<unknown>,
  selector: string,
  value: string,
): Promise<void> {
  const el = (fixture.nativeElement as HTMLElement).querySelector<
    HTMLInputElement | HTMLTextAreaElement
  >(selector);
  if (!el) {
    throw new Error(`No se encontró el elemento ${selector}`);
  }
  el.value = value;
  el.dispatchEvent(new Event('input'));
  await fixture.whenStable();
}

/** Dispara el evento submit del primer formulario del componente. */
export async function submitForm(fixture: ComponentFixture<unknown>): Promise<void> {
  const form = (fixture.nativeElement as HTMLElement).querySelector('form');
  if (!form) {
    throw new Error('No se encontró el formulario');
  }
  form.dispatchEvent(new Event('submit'));
  await fixture.whenStable();
}
