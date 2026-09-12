import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { catchError, Observable, of, tap, throwError } from 'rxjs';
import { AuthUser, LoginRequest, MessageResponse, RegisterRequest } from './auth.models';
import { CsrfService } from './csrf.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly csrf = inject(CsrfService);
  private readonly currentUser = signal<AuthUser | null>(null);
  private sessionChecked = false;

  readonly user = this.currentUser.asReadonly();
  readonly isAuthenticated = computed(() => this.currentUser() !== null);

  register(request: RegisterRequest): Observable<AuthUser> {
    return this.csrf
      .execute(() => this.http.post<AuthUser>('/api/auth/register', request))
      .pipe(
        tap((user) => {
          this.currentUser.set(user);
          this.sessionChecked = true;
        }),
      );
  }

  login(request: LoginRequest): Observable<AuthUser> {
    return this.csrf
      .execute(() => this.http.post<AuthUser>('/api/auth/login', request))
      .pipe(
        tap((user) => {
          this.currentUser.set(user);
          this.sessionChecked = true;
        }),
      );
  }

  resendVerification(): Observable<MessageResponse> {
    return this.csrf.execute(() =>
      this.http.post<MessageResponse>('/api/auth/verification/resend', {}),
    );
  }

  verifyEmail(token: string): Observable<MessageResponse> {
    return this.csrf
      .execute(() =>
        this.http.post<MessageResponse>('/api/auth/verification/confirm', { token }),
      )
      .pipe(
        tap(() =>
          this.currentUser.update((user) => (user ? { ...user, emailVerified: true } : null)),
        ),
      );
  }

  requestPasswordReset(email: string): Observable<MessageResponse> {
    return this.csrf.execute(() =>
      this.http.post<MessageResponse>('/api/auth/password/forgot', { email }),
    );
  }

  resetPassword(token: string, password: string): Observable<MessageResponse> {
    return this.csrf
      .execute(() =>
        this.http.post<MessageResponse>('/api/auth/password/reset', { token, password }),
      )
      .pipe(
        tap(() => {
          this.currentUser.set(null);
          this.sessionChecked = true;
        }),
      );
  }

  logout(): Observable<void> {
    return this.csrf
      .execute(() => this.http.post<void>('/api/auth/logout', {}))
      .pipe(
        tap(() => {
          this.currentUser.set(null);
          this.sessionChecked = true;
        }),
      );
  }

  loadCurrentUser(): Observable<AuthUser | null> {
    if (this.sessionChecked) {
      return of(this.currentUser());
    }

    return this.http.get<AuthUser>('/api/auth/me').pipe(
      tap((user) => {
        this.currentUser.set(user);
        this.sessionChecked = true;
      }),
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401) {
          this.currentUser.set(null);
          this.sessionChecked = true;
          return of(null);
        }
        return throwError(() => error);
      }),
    );
  }
}
