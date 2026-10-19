import { HttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PlatformLocation } from '@angular/common';
import { DOCUMENT } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { appConfig } from '../app.config';
import { CsrfService } from './csrf.service';

describe('Browser CSRF request contract', () => {
  let csrf: CsrfService;
  let client: HttpClient;
  let http: HttpTestingController;
  let cookie = '';

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ...appConfig.providers,
        provideHttpClientTesting(),
        {
          provide: PlatformLocation,
          useValue: { href: 'https://barberflow.example.test/login' },
        },
      ],
    });
    cookie = '';
    vi.spyOn(TestBed.inject(DOCUMENT), 'cookie', 'get').mockImplementation(() => cookie);
    csrf = TestBed.inject(CsrfService);
    client = TestBed.inject(HttpClient);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    vi.restoreAllMocks();
  });

  it('waits for the CSRF cookie and sends its raw value with session credentials on every write', () => {
    const registered = vi.fn();
    csrf
      .execute(() => client.post('/api/auth/register', { email: 'owner@example.test' }))
      .subscribe(registered);
    const firstCsrf = http.expectOne('/api/auth/csrf');
    expect(firstCsrf.request.withCredentials).toBe(true);
    expect(firstCsrf.request.headers.has('X-XSRF-TOKEN')).toBe(false);
    http.expectNone('/api/auth/register');

    cookie = 'XSRF-TOKEN=raw-cookie-token';
    firstCsrf.flush({
      headerName: 'X-XSRF-TOKEN',
      parameterName: '_csrf',
      token: 'masked-response-token',
    });
    const registration = http.expectOne('/api/auth/register');
    expect(registration.request.headers.get('X-XSRF-TOKEN')).toBe('raw-cookie-token');
    expect(registration.request.withCredentials).toBe(true);
    registration.flush({ id: 'owner-id' });
    expect(registered).toHaveBeenCalledExactlyOnceWith({ id: 'owner-id' });

    csrf
      .execute(() => client.patch('/api/dashboard/barbershop/publication', { published: true }))
      .subscribe();
    const secondCsrf = http.expectOne('/api/auth/csrf');
    http.expectNone('/api/dashboard/barbershop/publication');
    cookie = 'XSRF-TOKEN=refreshed-cookie-token';
    secondCsrf.flush({
      headerName: 'X-XSRF-TOKEN',
      parameterName: '_csrf',
      token: 'another-masked-response-token',
    });
    const publication = http.expectOne('/api/dashboard/barbershop/publication');
    expect(publication.request.headers.get('X-XSRF-TOKEN')).toBe('refreshed-cookie-token');
    expect(publication.request.withCredentials).toBe(true);
    publication.flush({ published: true });
  });

  it('does not attempt an account mutation when the CSRF refresh fails and allows retry', () => {
    const write = vi.fn(() => client.post('/api/auth/register', {}));
    const failed = vi.fn();
    csrf.execute(write).subscribe({ error: failed });
    http.expectOne('/api/auth/csrf').flush({}, { status: 503, statusText: 'Service unavailable' });

    expect(write).not.toHaveBeenCalled();
    expect(failed).toHaveBeenCalledOnce();
    http.expectNone('/api/auth/register');

    csrf.execute(write).subscribe();
    cookie = 'XSRF-TOKEN=retry-cookie-token';
    http.expectOne('/api/auth/csrf').flush({ token: 'masked-response-token' });
    const registration = http.expectOne('/api/auth/register');
    expect(registration.request.headers.get('X-XSRF-TOKEN')).toBe('retry-cookie-token');
    registration.flush({ id: 'owner-id' });
    expect(write).toHaveBeenCalledOnce();
  });

  it('does not put CSRF tokens on safe reads or leak them to another origin', () => {
    cookie = 'XSRF-TOKEN=private-cookie-token';
    client.get('/api/auth/me').subscribe();
    const read = http.expectOne('/api/auth/me');
    expect(read.request.headers.has('X-XSRF-TOKEN')).toBe(false);
    read.flush({ id: 'owner-id' });

    client.post('https://other.example.test/submit', {}).subscribe();
    const external = http.expectOne('https://other.example.test/submit');
    expect(external.request.headers.has('X-XSRF-TOKEN')).toBe(false);
    external.flush({});
  });
});
