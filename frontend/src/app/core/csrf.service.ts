import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, defer, Observable, shareReplay, switchMap, throwError } from 'rxjs';

interface CsrfResponse {
  headerName: string;
  parameterName: string;
  token: string;
}

@Injectable({ providedIn: 'root' })
export class CsrfService {
  private readonly http = inject(HttpClient);
  private prepared?: Observable<CsrfResponse>;

  prepare(): Observable<CsrfResponse> {
    if (!this.prepared) {
      const request = this.http.get<CsrfResponse>('/api/auth/csrf').pipe(
        catchError((error) => {
          if (this.prepared === request) this.prepared = undefined;
          return throwError(() => error);
        }),
        shareReplay({ bufferSize: 1, refCount: false }),
      );
      this.prepared = request;
    }
    return this.prepared;
  }

  execute<T>(request: () => Observable<T>): Observable<T> {
    return defer(() => {
      const preparation = this.prepared ?? this.http.get<CsrfResponse>('/api/auth/csrf');
      this.prepared = undefined;
      return preparation.pipe(switchMap(() => request()));
    });
  }
}
