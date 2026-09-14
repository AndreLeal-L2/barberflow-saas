# Vercel and Supabase Deployment

This deployment target is intended for the non-commercial BarberFlow portfolio
beta. Vercel Services and container images are currently beta features, and the
Vercel Hobby plan is restricted to personal, non-commercial use.

## Topology

```text
Internet -> Vercel domain -> Angular static service
                           -> /api/* -> Spring Boot container -> Supabase PostgreSQL
```

Both application services share one public origin. The browser therefore keeps
using the existing server-side session, HttpOnly cookie, and CSRF design without
storing an access token in browser storage.

Supabase is used only as hosted PostgreSQL. Do not add Supabase API keys to the
frontend. Authentication and authorization remain in Spring Security.

## 1. Create The Supabase Database

1. Create a Free Supabase project in a European region close to the Vercel
   function region.
2. Open **Connect** in the Supabase dashboard.
3. Select **Session pooler** and record the host, port, database name, and user.
4. Keep the database password in a password manager. Never commit it or send it
   through a pull request.

Use the session pooler on port `5432`. The transaction pooler is optimized for
short serverless queries but does not support prepared statements, which makes
it a worse default for the Spring JDBC and Hibernate application.

Flyway creates the application schema during the first backend start. Migration
`V9__protect_supabase_public_tables.sql` enables row-level security and removes
Data API privileges from Supabase's public client roles. The Spring application
connects directly to PostgreSQL and does not use the Supabase Data API.

## 2. Configure The Vercel Project

The Vercel project's **Root Directory** must be the repository root, not
`frontend` or `backend`. The root `vercel.json` defines both services and routes:

- `/api/*` and `/actuator/*` to the Spring Boot container
- every other path to the Angular static build

Add these environment variables to the **Production** environment:

```text
BARBERFLOW_DATABASE_URL=jdbc:postgresql://POOLER_HOST:5432/postgres?sslmode=require
BARBERFLOW_DATABASE_USERNAME=postgres.PROJECT_REF
BARBERFLOW_DATABASE_PASSWORD=SUPABASE_DATABASE_PASSWORD
BARBERFLOW_DATABASE_MAX_POOL_SIZE=2

BARBERFLOW_PUBLIC_BASE_URL=https://barberflow-saas-delta.vercel.app
BARBERFLOW_ALLOWED_ORIGINS=https://barberflow-saas-delta.vercel.app
BARBERFLOW_TIME_ZONE=Europe/Lisbon

CRON_SECRET=GENERATED_RANDOM_SECRET
```

The Vercel-specific backend image already sets `PORT=8080` and
`SPRING_PROFILES_ACTIVE=prod,vercel`. Generate the cron secret locally with:

```bash
openssl rand -hex 32
```

The Vercel profile defaults to portfolio mode: email verification is not required
and notifications are written to backend logs. This makes registration and
booking demonstrable without a third service, but password recovery,
confirmation, reminders, and customer cancellation links are not delivered by
email. Do not use this mode with real customer data.

For a zero-cost portfolio deployment that sends real booking emails, use the
Brevo adapter. It submits the 24-hour and 3-hour reminders to the provider within
Brevo's scheduling window, so their final delivery does not depend on the Vercel
container remaining active. Create a Free account, verify a sender address,
generate an API key, and add:

```text
BARBERFLOW_REQUIRE_EMAIL_VERIFICATION=true
BARBERFLOW_MAIL_DELIVERY=brevo
BARBERFLOW_MAIL_FROM=BarberFlow <VERIFIED_SENDER_EMAIL>
BREVO_API_KEY=SERVER_SIDE_API_KEY
```

At the time of this decision, Brevo Free allows 300 email sends per day, has no
time limit, and requires no card. Do not add a payment method, buy prepaid
credits, or enable a paid add-on. When the free daily allowance is exhausted,
delivery is limited rather than converted into paid usage. Free messages include
Brevo branding, and an unauthenticated sender domain can be replaced with a
Brevo-managed address. Recheck the current
[Free plan limits](https://help.brevo.com/hc/en-us/articles/208580669-FAQs-What-are-the-limits-of-the-Free-plan)
before activation. Never expose `BREVO_API_KEY` in Angular or commit it to Git.

The Resend adapter remains available as a future alternative. Sending to real
customers with Resend requires a domain controlled by the operator.

The SMTP adapter remains available for an always-on deployment by setting
`BARBERFLOW_MAIL_DELIVERY=smtp` and the `BARBERFLOW_MAIL_HOST`,
`BARBERFLOW_MAIL_PORT`, `BARBERFLOW_MAIL_USERNAME`, and
`BARBERFLOW_MAIL_PASSWORD` variables. On a scale-to-zero Vercel service, SMTP
reminder timing depends on when the backend is next awakened.

The daily Vercel Cron invokes `/api/internal/jobs/maintenance`. Vercel sends
`CRON_SECRET` in the `Authorization` header, and the backend compares it before
flushing pending provider schedules and running the idempotent retention
operation. Reminders farther than the provider scheduling horizon remain in the
outbox until a later maintenance run.

## 3. Publish

1. Confirm that the production branch is `main`.
2. Keep preview deployments protected, but make the production deployment public.
3. Add or confirm `barberflow-saas-delta.vercel.app` under **Settings > Domains**.
4. Redeploy the latest `main` commit after saving all environment variables.

Validate the deployment:

```bash
curl --fail --show-error https://barberflow-saas-delta.vercel.app/actuator/health
curl --fail --show-error --head https://barberflow-saas-delta.vercel.app/
```

Then complete the full smoke test: registration, email verification, service
creation, availability configuration, publication, public booking, cancellation,
and password recovery.

## Free-Tier Constraints

- Vercel may scale the backend container to zero after inactivity, so the first
  API request can be slower.
- Immediate notification retries run while a backend instance is active. The
  daily maintenance job resumes pending work, while reminders accepted by Brevo
  are scheduled independently of the application instance.
- Brevo Free currently limits the project to 300 email sends per day. Each
  booking can consume up to four sends: owner notification, customer
  confirmation, and two reminders.
- Supabase Free projects can pause after a week without activity and do not
  include automatic backups.
- The configuration pins dynamic workloads to Vercel's Paris region (`cdg1`).
  Select a nearby European Supabase region to avoid unnecessary database latency.
- Use synthetic data only. Move to paid infrastructure and complete the main
  production runbook before accepting paying customers or real customer data.

The general production controls remain documented in [DEPLOYMENT.md](DEPLOYMENT.md).
