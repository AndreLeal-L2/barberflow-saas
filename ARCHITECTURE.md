# Architecture

## Project Vision

BarberFlow SaaS is a SaaS platform for barbershops to manage online bookings.
The product is focused on independent barbers and small barbershops that need a simple booking link to share on Instagram, WhatsApp, Google Business Profile, or other channels.

The barber creates an account, selects a subscription plan, configures the public booking page, and receives a unique public URL such as:

```text
https://app.example.com/b/joao-cuts
```

Clients use that public page to choose a service, select an available time slot, and create a booking.

## Technical Goal

The technical goal is to build a professional full-stack Java portfolio project that demonstrates:

- Java backend development with Spring Boot
- REST API design
- Authentication and authorization
- Multi-tenant SaaS architecture
- PostgreSQL database modeling
- Database migrations
- Frontend/backend separation
- Angular and TypeScript frontend development
- Subscription-aware business rules
- Automated testing
- Docker-based local development
- Clean Git workflow and documentation

## Product Scope

### MVP Scope

The first version should include:

- SaaS landing page
- Pricing page with one booking plan
- Barber registration
- Barber login
- Barber dashboard
- Public barbershop profile configuration
- Service management
- Availability management
- Public booking page
- Client booking creation
- Booking list for the barber
- Booking cancellation
- Simulated subscription status

### Out Of Scope For MVP

The first version should not include:

- Real payment processing
- Stripe webhooks
- SMS notifications
- WhatsApp automation
- Mobile app
- Advanced analytics
- Marketplace search for barbershops
- Complex team permissions
- Multiple advanced subscription plans

## Chosen Stack

### Frontend

- Angular 22
- TypeScript
- Angular Router
- Reactive Forms
- HTTP client for REST API integration

### Backend

- Java 21
- Spring Boot 4
- Spring Web
- Spring Security
- Spring Data JPA
- Bean Validation
- OpenAPI/Swagger

### Database

- PostgreSQL
- Flyway for database migrations

### Infrastructure

- Docker
- Docker Compose for local development
- Separate frontend and backend applications
- Vercel Services for the non-commercial portfolio deployment
- Supabase hosted PostgreSQL for the non-commercial portfolio deployment

### Testing

- JUnit
- Mockito
- Spring Boot Test
- Testcontainers for PostgreSQL integration tests
- Frontend tests with Angular testing tools

## High-Level Architecture

```text
Browser
  |
  v
Angular Frontend
  |
  | HTTPS / REST JSON
  v
Spring Boot Backend API
  |
  v
PostgreSQL
```

The frontend never accesses the database directly.
All business rules, authorization checks, and data isolation rules are enforced by the backend.

The portfolio deployment keeps the same boundaries: Vercel serves Angular as
static files and routes `/api/*` to the Spring Boot container, while Spring Boot
is the only application component allowed to access Supabase PostgreSQL. See
[ADR-0002](docs/architecture-decisions/0002-vercel-supabase-portfolio-deployment.md).

## Repository Structure

```text
barberflow-saas/
  backend/
    src/main/java/...
    src/test/java/...
    pom.xml

  frontend/
    src/app/...
    package.json

  docs/
    architecture-decisions/

  docker-compose.yml
  README.md
  ARCHITECTURE.md
```

## Multi-Tenant Model

The platform is multi-tenant.
Each barbershop is treated as a tenant.

Data from one barbershop must never be visible to another barbershop.
Most business tables must include a `barbershop_id` column.

Examples:

- Services belong to one barbershop
- Barbers belong to one barbershop
- Availability rules belong to one barbershop
- Bookings belong to one barbershop
- Dashboard requests are scoped to the authenticated user's barbershop

## User Types

### Visitor

A visitor can:

- View the landing page
- View pricing
- Start registration
- Open a public barbershop booking page

### Barbershop Owner

A barbershop owner can:

- Register an account
- Log in
- Manage the barbershop profile
- Manage services
- Manage availability
- View bookings
- Cancel bookings
- Copy the public booking link

### Client

A client can:

- Open a public booking page
- View available services
- Select an available time slot
- Create a booking
- Cancel a booking if cancellation support is enabled

### Platform Admin

This role can be added later.
It would allow internal administration of tenants, plans, subscriptions, and support tasks.

## Backend Modules

The backend should be organized by business capability instead of only technical layers.

```text
auth
  Registration, login, authenticated user context, password handling.

tenant
  Tenant resolution and tenant isolation rules.

subscription
  Plans, subscription status, simulated billing state in the MVP.

barbershop
  Barbershop profile, public slug, public page configuration.

barber
  Barbers working inside a barbershop.

servicecatalog
  Services offered by a barbershop, duration, price, active status.

availability
  Working hours, blocked periods, and available slot calculation.

booking
  Booking creation, cancellation, status changes, overlap prevention.

notification
  Transactional email outbox, scheduled reminders, delivery retries, and
  provider adapters.

admin
  Future internal platform administration.
```

The zero-cost portfolio deployment uses the Brevo Free transactional API. Its
adapter submits near-term reminders to the provider and leaves reminders outside
the 71-hour scheduling horizon in the outbox for the authenticated daily
maintenance job. See
[ADR-0003](docs/architecture-decisions/0003-brevo-free-email-delivery.md).

## Core Domain Entities

### User

```text
id
name
email
password_hash
email_verified
role
barbershop_id
created_at
updated_at
```

### Barbershop

```text
id
name
slug
phone
email
public_description
public_address
published
active
subscription_status
created_at
updated_at
```

### Barber

```text
id
barbershop_id
name
display_order
active
created_at
updated_at
```

### Service

```text
id
barbershop_id
name
description
duration_minutes
price_amount
price_currency
active
created_at
updated_at
```

### Availability Rule

```text
id
barbershop_id
barber_id
day_of_week
start_time
end_time
active
created_at
updated_at
```

### Blocked Time

```text
id
barbershop_id
barber_id
start_at
end_at
reason
created_at
```

### Booking

```text
id
barbershop_id
barber_id
service_id
customer_name
customer_phone
customer_email
start_date_time
end_date_time
service_name_snapshot
service_duration_snapshot
service_price_snapshot
status
cancellation_token_hash
cancellation_token_expires_at
customer_cancelled_at
anonymized_at
created_at
updated_at
```

### Account Action Token

```text
id
user_id
purpose
token_hash
expires_at
consumed_at
created_at
```

Only a SHA-256 hash is stored. Raw verification and password reset tokens are
sent once through the notification outbox.

### Notification Outbox

```text
id
booking_id
notification_type
recipient
subject
body
scheduled_for
provider_message_id
status
attempt_count
next_attempt_at
last_error
created_at
sent_at
```

## Booking Statuses

The MVP can start with:

```text
CONFIRMED
CANCELLED
COMPLETED
```

Future statuses:

```text
PENDING
NO_SHOW
RESCHEDULED
```

## Subscription Model

The MVP will use a simulated subscription system.

Each barbershop will have a `subscription_status`.

Initial statuses:

```text
TRIALING
ACTIVE
PAST_DUE
CANCELLED
```

For the MVP:

- No real card payment is required
- No real Stripe Checkout is required
- No real webhook is required
- The application can manually mark a subscription as active
- Business rules should still check subscription status

This keeps the architecture ready for Stripe without blocking early development.

Future Stripe integration:

```text
Barber selects plan
  -> Backend creates Stripe Checkout Session
  -> Barber completes payment
  -> Stripe sends webhook
  -> Backend updates subscription_status
  -> Platform enables paid features
```

## Authentication Strategy

The recommended initial approach is Spring Security session-based authentication using secure HttpOnly cookies.

Reasons:

- The product is browser-first
- JavaScript cannot read HttpOnly cookies
- It avoids storing access tokens in localStorage
- It fits well with Spring Security
- It is a common approach for SaaS dashboards

The backend owns the authenticated session.
The Angular frontend only calls the API with credentials enabled and does not store access tokens in localStorage or sessionStorage.

Sessions are stored in PostgreSQL through Spring Session JDBC. Password resets
invalidate every stored session for the account. The application reloads the
current user from the database for `/api/auth/me`, so verification and account
state changes are reflected without trusting stale response data.

Security requirements:

- Cookies must be `HttpOnly`
- Cookies must be `Secure` in production
- Cookies should use `SameSite=Lax` or `SameSite=Strict` where possible
- CSRF protection must be enabled for unsafe requests if cookie authentication is used
- CORS must explicitly allow only trusted frontend origins

The session cookie is named `BARBERFLOW_SESSION`. It is `HttpOnly` and uses
`SameSite=Lax`; `Secure` is disabled only for local HTTP development and must be
enabled in production. Angular reads a separate `XSRF-TOKEN` cookie and sends its
value in the `X-XSRF-TOKEN` header. That CSRF cookie is intentionally readable by
JavaScript and is not an authentication credential.

The complete rationale is recorded in
[`ADR-0001`](docs/architecture-decisions/0001-session-authentication.md).

JWT may still be considered later for mobile apps, public APIs, or third-party integrations.

## Authorization Rules

Dashboard API endpoints require authentication.

Tenant-scoped endpoints must only return data for the authenticated user's `barbershop_id`.

Public booking endpoints do not require login, but they must:

- Only expose public barbershop data
- Only expose active services
- Only allow bookings for active barbershops
- Only allow bookings when the subscription allows it
- Validate availability before creating a booking

## Main Frontend Routes

```text
/
  Landing page

/pricing
  Pricing page

/register
  Barbershop owner registration

/login
  Login

/forgot-password
  Password recovery request

/reset-password
  One-time password reset

/verify-email
  One-time email confirmation

/cancel-booking
  Customer cancellation by one-time link

/privacy and /terms
  Beta legal information

/dashboard
  Main dashboard

/dashboard/bookings
  Booking management

/dashboard/services
  Service management

/dashboard/availability
  Availability management

/dashboard/profile
  Public profile configuration

/b/:slug
  Public barbershop page and booking flow
```

## Initial REST API

### Auth

```text
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/me
GET  /api/auth/csrf
POST /api/auth/verification/confirm
POST /api/auth/verification/resend
POST /api/auth/password/forgot
POST /api/auth/password/reset
```

### Barbershop Dashboard

```text
GET   /api/dashboard/barbershop
PUT   /api/dashboard/barbershop/profile
PATCH /api/dashboard/barbershop/publication
```

### Public Barbershop

```text
GET  /api/public/barbershops/{slug}
GET  /api/public/barbershops/{slug}/services
GET  /api/public/barbershops/{slug}/available-slots
POST /api/public/barbershops/{slug}/bookings
POST /api/public/bookings/cancel
```

### Services

```text
GET    /api/dashboard/services
POST   /api/dashboard/services
PUT    /api/dashboard/services/{id}
DELETE /api/dashboard/services/{id}
```

### Availability

```text
GET    /api/dashboard/availability
PUT    /api/dashboard/availability
GET    /api/dashboard/availability/blocks
POST   /api/dashboard/availability/blocks
DELETE /api/dashboard/availability/blocks/{id}
```

### Bookings

```text
GET   /api/dashboard/bookings
PATCH /api/dashboard/bookings/{id}/status
```

### Dashboard Analytics

```text
GET /api/dashboard/analytics
```

The analytics response is calculated for the authenticated barbershop only. It
combines the previous 30 days of completed and cancelled appointments with the
next 30 days of confirmed appointments. `scheduledValue` is the sum of service
price snapshots for upcoming confirmed appointments; it is operational forecast
data and must not be presented as received revenue.

### Subscription (Future Administration API)

```text
GET   /api/dashboard/subscription
PATCH /api/dashboard/subscription/simulated-status
```

The simulated subscription update endpoint should be restricted to development or admin usage.

The current MVP creates new tenants with `TRIALING` status. Both `TRIALING` and
`ACTIVE` grant booking access; payment and subscription administration endpoints
remain intentionally deferred.

## Business Rules

- A booking cannot overlap another active booking for the same barber.
- Booking creation locks the selected barber while availability is rechecked, preventing concurrent double booking.
- A booking must fit inside the barber's availability rules.
- A blocked period removes every overlapping slot from the public booking page.
- A blocked period cannot overlap another blocked period or a non-cancelled booking.
- Blocked-period creation uses the same barber lock as booking creation to prevent race conditions.
- Public bookings can be created up to 60 days ahead and start on 30-minute boundaries.
- Cancelled bookings do not block availability.
- A customer cancellation token is random, stored only as a hash, single-use, and expires at the booking start.
- Online customer cancellation requires at least two hours of notice by default.
- Completed bookings remain visible in history.
- Public booking is blocked if the barbershop subscription is not active or trialing.
- A barbershop slug must be unique.
- Public pages only show active barbershops.
- Public pages only show active services.
- Service name, duration, and price must be snapshotted into the booking.
- Dashboard users can only access resources from their own barbershop.
- Dashboard analytics must query a bounded date range and filter by the authenticated barbershop ID.
- New production tenants must confirm the owner email before publishing.
- Verification links expire after 24 hours; password reset links expire after 30 minutes.
- Booking personal data is anonymized after 365 days by default.
- Notification delivery is asynchronous and retried with bounded backoff.

## Database Practices

- Use PostgreSQL as the main database.
- Use Flyway migrations from the beginning.
- Use UUID or generated numeric IDs consistently.
- Add indexes for common lookup fields.
- Add unique constraints where business rules require uniqueness.
- Use database constraints to support critical rules.

Recommended unique constraints:

```text
users.email
barbershops.slug
```

Recommended indexes:

```text
bookings.barbershop_id
bookings.barber_id
bookings.start_date_time
services.barbershop_id
availability_rules.barbershop_id
```

## Error Handling

The backend should return consistent API errors.

Example:

```json
{
  "code": "BOOKING_SLOT_UNAVAILABLE",
  "message": "The selected time slot is no longer available.",
  "details": {}
}
```

Common error types:

- Validation errors
- Authentication errors
- Authorization errors
- Tenant isolation errors
- Resource not found errors
- Booking availability errors
- Subscription errors

## Git Workflow

The project should follow a clean Git workflow:

- `main` is always stable
- Features are developed in short-lived branches
- Branch names use clear prefixes
- Commits are small and focused
- Commit messages follow Conventional Commits
- Pull requests describe the change and testing performed

Suggested branch prefixes:

```text
feat/
fix/
docs/
test/
refactor/
chore/
```

Commit examples:

```text
docs: add initial architecture document
feat: add barbershop registration endpoint
fix: prevent overlapping bookings
test: add booking availability tests
chore: configure docker compose
```

## Roadmap

### Phase 1: Foundation

- Repository setup
- Architecture documentation
- Backend Spring Boot structure
- Frontend Angular structure
- Docker Compose
- PostgreSQL setup
- Flyway setup

### Phase 2: Core SaaS

- [x] Registration
- [x] Login
- [x] Tenant model
- [x] Barbershop profile
- [x] Service management
- [x] Availability management
- [x] Public booking page
- [x] Booking creation
- [x] Booking dashboard
- [x] Simulated subscription status

### Phase 3: Quality

- [x] Backend unit tests
- [x] Backend integration tests
- [x] Frontend tests
- [x] API documentation for development
- [x] Error handling standardization
- [x] Security hardening baseline
- [x] Production profile and deployment runbook
- [x] Automated dependency and container scanning

### Phase 4: Real Billing

- Stripe Checkout
- Stripe customer mapping
- Stripe subscription mapping
- Stripe webhook handling
- Subscription lifecycle automation

### Phase 5: Product Growth

- [x] Transactional email notifications
- [x] Booking confirmation and reminders 24 hours and 3 hours before the
  appointment
- WhatsApp/SMS notifications
- Multiple barbers per shop
- Rescheduling
- [x] Customer booking cancellation link
- [x] Analytics dashboard
- Admin platform dashboard

## Portfolio Description

Suggested CV description:

```text
Developed a multi-tenant SaaS booking platform for barbershops using Java, Spring Boot, PostgreSQL, Spring Security, REST APIs, Angular, TypeScript, Docker, and automated testing. The platform includes tenant isolation, booking availability rules, a public booking page, a barber dashboard, and subscription-aware access control.
```
