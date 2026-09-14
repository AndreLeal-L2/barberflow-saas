# ADR-0002: Use Vercel and Supabase for the Portfolio Deployment

- Status: Accepted
- Date: 2026-09-13

## Context

BarberFlow needs a publicly accessible portfolio environment with no fixed
monthly infrastructure cost. The repository contains separate Angular and
Spring Boot applications, and the authentication design requires both to share
one public origin. The Java backend also needs a persistent PostgreSQL database
for tenant data and Spring Session.

## Decision

Use Vercel Services to deploy Angular as a static service and Spring Boot as a
container service. Route `/api/*` and `/actuator/*` to Spring Boot and all other
paths to Angular under the same Vercel domain.

Use a Supabase Free PostgreSQL database through its session pooler. Supabase is
only the database host: the browser never receives Supabase credentials and does
not access the Data API. Spring Security, tenant authorization, business rules,
Flyway migrations, and server-side sessions remain in the Java backend.

Use a Vercel Cron protected by `CRON_SECRET` for daily data retention. Keep the
Docker Compose deployment as the portable option for future commercial hosting.

## Consequences

- Browser authentication keeps the existing HttpOnly session cookie and CSRF
  protection because frontend and backend share one origin.
- The backend can scale to zero, so its first request after inactivity may be
  slower and background email retries resume only when an instance is active.
- PostgreSQL connection pools must remain small because container instances can
  scale independently.
- Public Supabase client roles have no access to application tables; row-level
  security is enabled as defense in depth.
- This target is for synthetic portfolio data and non-commercial use. Vercel
  Hobby restrictions, Supabase pausing, backup limitations, and beta container
  behavior make it unsuitable for paying customers without reassessment.
