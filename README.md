# BarberFlow SaaS

Multi-tenant booking SaaS for independent barbers and small barbershops. BarberFlow gives each business a public booking link and a private dashboard for managing its operation.

The project is a full-stack Java portfolio application with a separated Angular frontend and Spring Boot REST API. Its engineering focus is secure browser authentication, tenant isolation, explicit database migrations, automated tests, and reproducible local environments.

## Current Status

The working MVP includes:

- Responsive landing and pricing pages
- Barbershop owner registration
- Login, authenticated session recovery, and logout
- Spring Security session authentication with an HttpOnly cookie
- CSRF protection and restricted credentialed CORS
- PostgreSQL persistence with versioned Flyway migrations
- Tenant-aware owner, barbershop, barber, service, availability, and booking models
- Service catalogue management with create, edit, and removal flows
- Weekly availability management with 30-minute booking intervals
- Full-day and custom schedule exceptions that remove blocked periods from public booking
- Public barbershop profile and publication controls
- Public booking link with service, date, time, and customer data selection
- Availability calculation and concurrent booking conflict prevention
- Authenticated agenda with upcoming bookings, history, cancellation, and completion
- Simulated `TRIALING` subscription state
- OpenAPI UI, health endpoint, integration tests, and Docker Compose

## Tech Stack

- Java 21 and Spring Boot 4
- Spring Security and Spring Data JPA
- PostgreSQL 17 and Flyway
- Angular 22 and TypeScript
- Docker and Docker Compose
- OpenAPI/Swagger
- JUnit, Mockito, Testcontainers, and Vitest

## Run Locally

Prerequisite: Docker Desktop or Docker Engine with Compose.

```bash
cp .env.example .env
docker compose up --build
```

Open:

- Web application: <http://localhost:8081>
- API health: <http://localhost:8080/actuator/health>
- OpenAPI UI: <http://localhost:8080/swagger-ui.html>

Stop the stack with:

```bash
docker compose down
```

The PostgreSQL data is kept in the `barberflow_postgres_data` Docker volume.

## Development

Run the backend with Java 21 and Docker available for Testcontainers:

```bash
cd backend
./mvnw spring-boot:run
./mvnw test
```

Run the frontend with Node.js 24 and pnpm:

```bash
cd frontend
pnpm install
pnpm start
pnpm test --watch=false
```

The Angular development server proxies `/api` and `/actuator` to the backend at port `8080`.

## Main Product Flow

1. Create a barbershop owner account.
2. Add at least one service in the private dashboard.
3. Configure the weekly working hours and any exceptional blocked periods.
4. Optionally complete the public profile and publish the booking page.
5. Share the generated `/b/{slug}` link with clients.
6. Clients choose an available slot and create a booking without an account.
7. The owner manages the booking from the private agenda.

## Repository Structure

```text
barberflow-saas/
  backend/                   Spring Boot REST API
  frontend/                  Angular web application
  docs/architecture-decisions/
  .github/workflows/         Continuous integration
  docker-compose.yml
  ARCHITECTURE.md
```

## Architecture and Security

The product architecture and roadmap are documented in [ARCHITECTURE.md](ARCHITECTURE.md). Important technical decisions are recorded as ADRs in [`docs/architecture-decisions`](docs/architecture-decisions).

Authentication uses a server-side session identified by the `BARBERFLOW_SESSION` HttpOnly cookie. The frontend never stores credentials or access tokens in `localStorage` or `sessionStorage`. Mutating requests require a CSRF token, and production must enable secure cookies and HTTPS.

## Git Workflow

- `main` contains stable code
- Work is developed in short-lived branches
- Pull requests must describe the change and its verification
- Commit messages follow Conventional Commits

Examples:

```text
docs: add initial architecture document
feat: add barbershop registration
fix: prevent overlapping bookings
test: add booking availability tests
chore: configure docker compose
```

## Image Credit

Landing page photograph by [John Karlo Mendoza on Unsplash](https://unsplash.com/photos/barber-cutting-mans-hair-idzUojjazCg).
