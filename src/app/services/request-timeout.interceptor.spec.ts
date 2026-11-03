import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TimeoutError } from 'rxjs';

import { REQUEST_TIMEOUT_MS, requestTimeoutInterceptor } from './request-timeout.interceptor';

describe('requestTimeoutInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([requestTimeoutInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    vi.useRealTimers();
  });

  it('falla con TimeoutError si la API no responde a tiempo', () => {
    let error: unknown;
    http.get('/x').subscribe({ error: (err) => (error = err) });
    const req = httpMock.expectOne('/x');

    vi.advanceTimersByTime(REQUEST_TIMEOUT_MS);

    expect(error).toBeInstanceOf(TimeoutError);
    expect(req.cancelled).toBe(true);
  });

  it('no afecta a las respuestas que llegan a tiempo', () => {
    let result: unknown;
    http.get('/x').subscribe((res) => (result = res));

    vi.advanceTimersByTime(REQUEST_TIMEOUT_MS - 1);
    httpMock.expectOne('/x').flush({ ok: true });

    expect(result).toEqual({ ok: true });
  });
});
