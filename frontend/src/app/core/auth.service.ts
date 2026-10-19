import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { catchError, map, Observable, of, tap, throwError } from 'rxjs';
import { AuthUser, LoginRequest, MessageResponse, RegisterRequest } from './auth.models';
import { CsrfService } from './csrf.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly csrf = inject(CsrfService);
  private readonly currentUser = signal<AuthUser | null>(null);
  private sessionChecked = false;
  private sessionVersion = 0;

  readonly user = this.currentUser.asReadonly();
  readonly isAuthenticated = computed(() => this.currentUser() !== null);

  register(request: RegisterRequest): Observable<AuthUser> {
    return this.csrf
      .execute(() => this.http.post<AuthUser>('/api/auth/register', request))
      .pipe(tap((user) => this.setSession(user)));
  }

  login(request: LoginRequest): Observable<AuthUser> {
    return this.csrf
      .execute(() => this.http.post<AuthUser>('/api/auth/login', request))
      .pipe(tap((user) => this.setSession(user)));
  }

  resendVerification(): Observable<MessageResponse> {
    return this.csrf.execute(() =>
      this.http.post<MessageResponse>('/api/auth/verification/resend', {}),
    );
  }

  verifyEmail(token: string): Observable<MessageResponse> {
    return this.csrf
      .execute(() => this.http.post<MessageResponse>('/api/auth/verification/confirm', { token }))
      .pipe(
        tap(() => {
          const user = this.currentUser();
          if (user) {
            this.setSession({ ...user, emailVerified: true });
          }
        }),
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
      .pipe(tap(() => this.setSession(null)));
  }

  logout(): Observable<void> {
    return this.csrf
      .execute(() => this.http.post<void>('/api/auth/logout', {}))
      .pipe(tap(() => this.setSession(null)));
  }

  loadCurrentUser(forceRefresh = false): Observable<AuthUser | null> {
    if (this.sessionChecked && !forceRefresh) {
      return of(this.currentUser());
    }

    const sessionVersion = this.sessionVersion;
    return this.http.get<AuthUser>('/api/auth/me').pipe(
      map((user) => {
        if (sessionVersion !== this.sessionVersion) {
          return this.currentUser();
        }
        this.currentUser.set(user);
        this.sessionChecked = true;
        return user;
      }),
      catchError((error: HttpErrorResponse) => {
        if (sessionVersion !== this.sessionVersion) {
          return of(this.currentUser());
        }
        if (error.status === 401) {
          this.setSession(null);
          return of(null);
        }
        return throwError(() => error);
      }),
    );
  }

  private setSession(user: AuthUser | null): void {
    this.sessionVersion++;
    this.currentUser.set(user);
    this.sessionChecked = true;
  }
}
