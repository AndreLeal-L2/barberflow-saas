# ADR-0001: Use Server-Side Sessions for Browser Authentication

- Status: Accepted
- Date: 2026-09-09

## Context

BarberFlow is initially a browser-first SaaS with an Angular frontend and a Spring Boot backend. The application needs secure authentication for barbershop owners without exposing a reusable credential to browser JavaScript.

The alternatives considered were JWTs stored in `localStorage`, JWTs stored in HttpOnly cookies, and opaque server-side sessions identified by an HttpOnly cookie.

## Decision

Use Spring Security server-side sessions. The browser receives an opaque session identifier in the `BARBERFLOW_SESSION` cookie with these properties:

- `HttpOnly`, so frontend JavaScript cannot read it
- `SameSite=Lax`
- `Secure` in production over HTTPS
- 30-minute inactivity timeout

Persist sessions in PostgreSQL through Spring Session JDBC so deployments and
backend restarts do not log users out.

Keep CSRF protection enabled for state-changing requests. Spring exposes a separate `XSRF-TOKEN` cookie that Angular can read and return through the `X-XSRF-TOKEN` request header. This cookie contains an anti-CSRF value, not the authenticated session credential.

CORS permits credentials only from explicitly configured frontend origins. Passwords are hashed with BCrypt and are never returned by the API.

## Consequences

- A token stolen from `localStorage` is not part of the threat model because no authentication token is stored there.
- The backend owns session state and all instances must use the same PostgreSQL session store.
- Browser clients must send credentials and a valid CSRF token.
- Production deployment requires HTTPS and `BARBERFLOW_COOKIE_SECURE=true`.
- JWT can be reconsidered for a mobile client or third-party API, but it is not required for the current product.
