# Production Deployment

This runbook describes the minimum production setup for the BarberFlow beta. It
does not replace the terms, data-processing agreements, or operational controls
of the selected hosting and email providers.

## Release Gate

Do not accept real users until all of these items are complete:

- A domain and TLS certificate are active.
- The hosting region and subprocessors are documented.
- The operator's legal name, address, privacy email, and applicable terms replace
  the temporary repository contact in the legal pages.
- An SMTP provider is configured with SPF, DKIM, and DMARC for the sender domain.
- Automated encrypted backups are stored outside the application host.
- A restore has been tested against a separate database.
- Uptime checks cover the public page and `/actuator/health`.
- Alerts cover HTTP 5xx responses, container restarts, disk usage, PostgreSQL
  capacity, and repeated `Notification delivery failed` logs.
- GitHub branch protection requires the CI and Security workflows before merge.
- The beta limitation is visible: billing remains simulated and no payment is
  collected.

## Topology

`docker-compose.production.yml` exposes only the frontend on the host loopback
interface. PostgreSQL and Spring Boot remain on the Compose network. Put a TLS
reverse proxy or managed load balancer in front of `127.0.0.1:8081`.

```text
Internet -> HTTPS reverse proxy -> Angular/Nginx -> Spring Boot -> PostgreSQL
                                      |                 |
                                      +--- same origin --+
                                                        -> SMTP provider
```

Using one public origin keeps the session and CSRF cookie model simple. Do not
publish ports `5432` or `8080` to the internet.

## Environment

Create an ignored `.env.production` file on the host. Generate independent,
high-entropy credentials instead of using the values from `.env.example`.

```bash
openssl rand -base64 48
cp .env.example .env.production
chmod 600 .env.production
```

Required production values:

- `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`
- `BARBERFLOW_PUBLIC_BASE_URL`, for example `https://app.example.com`
- `BARBERFLOW_ALLOWED_ORIGINS`, normally the same public origin
- `BARBERFLOW_MAIL_HOST`, `BARBERFLOW_MAIL_PORT`
- `BARBERFLOW_MAIL_USERNAME`, `BARBERFLOW_MAIL_PASSWORD`
- `BARBERFLOW_MAIL_FROM`

The `prod` Spring profile enforces secure cookies, requires email verification
before publication, disables Swagger, uses structured logs, and sends queued
notifications through SMTP.

## Start And Validate

```bash
docker compose \
  --env-file .env.production \
  -f docker-compose.production.yml \
  config

docker compose \
  --env-file .env.production \
  -f docker-compose.production.yml \
  up --build -d
```

After TLS is active, verify:

```bash
curl --fail --show-error https://app.example.com/actuator/health
curl --fail --show-error https://app.example.com/
```

Complete a smoke test with a new address: register, confirm the email, create a
service, configure availability, publish, create a customer booking, receive the
confirmation, cancel from its one-time link, and sign in after a password reset.

## Backup And Restore

Run the backup script with the same environment used by Compose:

```bash
set -a
source .env.production
set +a
./scripts/backup-postgres.sh
```

The script creates a permission-restricted PostgreSQL custom dump in `backups/`.
Move it immediately to encrypted object storage with retention and access
controls. A local dump on the same server is not a production backup.

Test restoration on a disposable environment at least quarterly:

```bash
set -a
source .env.production
set +a
CONFIRM_RESTORE=barberflow ./scripts/restore-postgres.sh backups/example.dump
```

The restore command is destructive for the target database. Never use the
production target for a routine restore drill.

## Updating And Rollback

1. Confirm CI and Security are green.
2. Create an off-host backup and record the image or commit being deployed.
3. Pull the reviewed commit and rebuild the stack.
4. Check migrations, health, application logs, login, and one public booking.
5. Roll back application images to the previous commit if needed.

Flyway migrations are forward-only. Do not edit migrations already deployed.
Database rollback means restoring the pre-release backup and losing writes made
after that backup, so prefer a corrective forward migration when practical.

## Operations Notes

- Application rate limits use bounded in-process state and Nginx edge limits.
  Introduce a shared limiter before running multiple backend replicas.
- The notification outbox retries failed email delivery five times. The provided
  topology assumes one backend replica; add row claiming before horizontal scale.
- SMTP health is intentionally not part of application readiness because queued
  email can retry. Alert on failed delivery logs instead.
- Booking personal data is anonymized after 365 days by default. Sent and failed
  notification records are removed after 30 days.
- Review retention, legal basis, subprocessors, and international transfers with
  appropriate legal advice before moving from a portfolio beta to a paid service.
