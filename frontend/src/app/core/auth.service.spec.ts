import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AuthUser } from './auth.models';
import { AuthService } from './auth.service';
import { CsrfService } from './csrf.service';

describe('AuthService current user refresh', () => {
  const user: AuthUser = {
    id: 'owner-id',
    name: 'João Silva',
    email: 'owner@example.test',
    emailVerified: false,
    emailVerificationRequired: true,
    role: 'OWNER',
    barbershop: {
      id: 'barbershop-id',
      name: 'Barbearia Central',
      slug: 'barbearia-central',
      subscriptionStatus: 'TRIALING',
    },
  };
  let auth: AuthService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: CsrfService, useValue: {} },
      ],
    });
    auth = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('uses the cached user by default and refetches and updates it only when forced', () => {
    auth.loadCurrentUser().subscribe();
    http.expectOne('/api/auth/me').flush(user);

    const cached = vi.fn();
    auth.loadCurrentUser().subscribe(cached);
    http.expectNone('/api/auth/me');
    expect(cached).toHaveBeenCalledExactlyOnceWith(user);

    const refreshed = vi.fn();
    const verified = { ...user, emailVerified: true };
    auth.loadCurrentUser(true).subscribe(refreshed);
    http.expectOne('/api/auth/me').flush(verified);

    expect(refreshed).toHaveBeenCalledExactlyOnceWith(verified);
    expect(auth.user()).toEqual(verified);
    auth.loadCurrentUser().subscribe();
    http.expectNone('/api/auth/me');
  });

  it('preserves the cached verification state when a forced refresh fails temporarily', () => {
    auth.loadCurrentUser().subscribe();
    http.expectOne('/api/auth/me').flush(user);
    const failed = vi.fn();

    auth.loadCurrentUser(true).subscribe({ error: failed });
    http.expectOne('/api/auth/me').flush({}, { status: 503, statusText: 'Service unavailable' });

    expect(failed).toHaveBeenCalledOnce();
    expect(auth.user()).toEqual(user);
    auth.loadCurrentUser().subscribe();
    http.expectNone('/api/auth/me');
  });

  it('clears an expired session when a forced refresh returns unauthorized', () => {
    auth.loadCurrentUser().subscribe();
    http.expectOne('/api/auth/me').flush(user);
    const refreshed = vi.fn();

    auth.loadCurrentUser(true).subscribe(refreshed);
    http.expectOne('/api/auth/me').flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(refreshed).toHaveBeenCalledExactlyOnceWith(null);
    expect(auth.user()).toBeNull();
    expect(auth.isAuthenticated()).toBe(false);
  });
});
