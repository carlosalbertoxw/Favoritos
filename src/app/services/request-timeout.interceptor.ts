import { HttpInterceptorFn } from '@angular/common/http';
import { timeout } from 'rxjs';

export const REQUEST_TIMEOUT_MS = 10_000;

/** Evita que una API sin respuesta deje la pantalla esperando indefinidamente. */
export const requestTimeoutInterceptor: HttpInterceptorFn = (req, next) =>
  next(req).pipe(timeout(REQUEST_TIMEOUT_MS));
