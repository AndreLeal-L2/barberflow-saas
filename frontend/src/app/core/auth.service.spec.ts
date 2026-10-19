import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Observable } from 'rxjs';
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
        {
          provide: CsrfService,
          useValue: { execute: (request: () => Observable<unknown>) => request() },
        },
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

  it('does not restore a logged-out user when an older refresh completes after logout', () => {
    auth.loadCurrentUser().subscribe();
    http.expectOne('/api/auth/me').flush(user);
    const refreshed = vi.fn();
    auth.loadCurrentUser(true).subscribe(refreshed);
    const oldRefresh = http.expectOne('/api/auth/me');

    auth.logout().subscribe();
    http.expectOne('/api/auth/logout').flush(null);
    oldRefresh.flush(user);

    expect(auth.user()).toBeNull();
    expect(auth.isAuthenticated()).toBe(false);
    expect(refreshed).toHaveBeenCalledExactlyOnceWith(null);
  });

  it('does not clear a new login when a refresh from the previous session returns unauthorized', () => {
    auth.loadCurrentUser().subscribe();
    http.expectOne('/api/auth/me').flush(user);
    const refreshed = vi.fn();
    auth.loadCurrentUser(true).subscribe(refreshed);
    const oldRefresh = http.expectOne('/api/auth/me');
    const newUser = { ...user, id: 'another-owner-id', email: 'another-owner@example.test' };

    auth.login({ email: newUser.email, password: 'Exact Password 2026!' }).subscribe();
    http.expectOne('/api/auth/login').flush(newUser);
    oldRefresh.flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(auth.user()).toEqual(newUser);
    expect(auth.isAuthenticated()).toBe(true);
    expect(refreshed).toHaveBeenCalledExactlyOnceWith(newUser);
  });

  it('stores the newly registered session without requiring another current-user request', () => {
    const registered = vi.fn();
    auth
      .register({
        ownerName: user.name,
        barbershopName: user.barbershop.name,
        email: user.email,
        phone: '+351 910 000 001',
        password: 'Exact Password 2026!',
      })
      .subscribe(registered);
    http.expectOne('/api/auth/register').flush(user);

    expect(registered).toHaveBeenCalledExactlyOnceWith(user);
    expect(auth.isAuthenticated()).toBe(true);
    const cached = vi.fn();
    auth.loadCurrentUser().subscribe(cached);
    http.expectNone('/api/auth/me');
    expect(cached).toHaveBeenCalledExactlyOnceWith(user);
  });

  it('preserves the active session when logout fails so the user can retry', () => {
    auth.loadCurrentUser().subscribe();
    http.expectOne('/api/auth/me').flush(user);
    const failed = vi.fn();

    auth.logout().subscribe({ error: failed });
    http
      .expectOne('/api/auth/logout')
      .flush({}, { status: 503, statusText: 'Service unavailable' });

    expect(failed).toHaveBeenCalledOnce();
    expect(auth.user()).toEqual(user);
    expect(auth.isAuthenticated()).toBe(true);
    auth.logout().subscribe();
    http.expectOne('/api/auth/logout').flush(null);
    expect(auth.user()).toBeNull();
  });

  it('requires a new login after a successful password reset', () => {
    auth.loadCurrentUser().subscribe();
    http.expectOne('/api/auth/me').flush(user);

    auth.resetPassword('one-use-reset-token', 'Changed Password 2026!').subscribe();
    const reset = http.expectOne('/api/auth/password/reset');
    expect(reset.request.body).toEqual({
      token: 'one-use-reset-token',
      password: 'Changed Password 2026!',
    });
    reset.flush({ message: 'Palavra-passe atualizada.' });

    expect(auth.user()).toBeNull();
    expect(auth.isAuthenticated()).toBe(false);
    auth.loadCurrentUser().subscribe();
    http.expectNone('/api/auth/me');
  });

  it('updates verification without replacing the current account identity', () => {
    auth.loadCurrentUser().subscribe();
    http.expectOne('/api/auth/me').flush(user);

    auth.verifyEmail('one-use-verification-token').subscribe();
    const verification = http.expectOne('/api/auth/verification/confirm');
    expect(verification.request.body).toEqual({ token: 'one-use-verification-token' });
    verification.flush({ message: 'E-mail confirmado.' });

    expect(auth.user()).toEqual({ ...user, emailVerified: true });
    expect(auth.isAuthenticated()).toBe(true);
  });

  it('keeps email verification confirmed when an older current-user refresh returns late', () => {
    auth.loadCurrentUser().subscribe();
    http.expectOne('/api/auth/me').flush(user);
    const refreshed = vi.fn();
    auth.loadCurrentUser(true).subscribe(refreshed);
    const oldRefresh = http.expectOne('/api/auth/me');

    auth.verifyEmail('one-use-verification-token').subscribe();
    http.expectOne('/api/auth/verification/confirm').flush({ message: 'E-mail confirmado.' });
    oldRefresh.flush(user);

    const verified = { ...user, emailVerified: true };
    expect(auth.user()).toEqual(verified);
    expect(refreshed).toHaveBeenCalledExactlyOnceWith(verified);
  });
});
