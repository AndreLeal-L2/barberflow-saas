import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Login } from './login';

describe('Login preparation', () => {
  beforeEach(() => TestBed.configureTestingModule({ imports: [Login], providers: [
    provideRouter([]), provideHttpClient(), provideHttpClientTesting(),
  ] }));

  it('starts preparing the backend before submission and reuses that pending request', () => {
    const fixture = TestBed.createComponent(Login);
    fixture.detectChanges();
    const http = TestBed.inject(HttpTestingController);
    const preparation = http.expectOne('/api/auth/csrf');
    fixture.componentInstance.form.setValue({ email: 'owner@example.test', password: 'TesteSeguro2026!' });
    fixture.componentInstance.submit();
    http.expectNone('/api/auth/csrf');
    http.expectNone('/api/auth/login');
    preparation.flush({ token: 'masked-token' });
    http.expectOne('/api/auth/login').flush({}, { status: 401, statusText: 'Unauthorized' });
    fixture.componentInstance.submit();
    http.expectOne('/api/auth/csrf').flush({ token: 'fresh-token' });
    http.expectOne('/api/auth/login').flush({}, { status: 401, statusText: 'Unauthorized' });
    http.verify();
  });

  it('keeps the login form usable after background preparation fails', () => {
    const fixture = TestBed.createComponent(Login);
    fixture.detectChanges();
    const http = TestBed.inject(HttpTestingController);
    http.expectOne('/api/auth/csrf').flush({}, { status: 503, statusText: 'Unavailable' });
    expect(fixture.componentInstance.submitting()).toBe(false);
    expect(fixture.componentInstance.serverError()).toBeNull();
    fixture.componentInstance.form.setValue({ email: 'owner@example.test', password: 'TesteSeguro2026!' });
    fixture.componentInstance.submit();
    http.expectOne('/api/auth/csrf').flush({ token: 'fresh-token' });
    http.expectOne('/api/auth/login').flush({}, { status: 401, statusText: 'Unauthorized' });
    http.verify();
  });
});
