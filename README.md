# BarberFlow SaaS

Multi-tenant SaaS booking platform for barbershops built with Java Spring Boot, Angular, PostgreSQL, and secure session-based authentication.

## Overview

BarberFlow SaaS helps barbers and small barbershops manage online bookings through a simple public booking link. A barbershop owner can create an account, configure services and availability, share a public booking page, and manage client appointments from a dashboard.

The project is designed as a professional full-stack Java portfolio application. It uses a separated Angular frontend and Spring Boot backend, with a focus on clean architecture, REST API design, tenant data isolation, secure authentication with HttpOnly cookies, PostgreSQL persistence, and subscription-aware business rules.

## Planned Tech Stack

- Java 21
- Spring Boot
- Spring Security
- Spring Data JPA
- PostgreSQL
- Flyway
- Angular
- TypeScript
- Docker
- Docker Compose
- JUnit
- Mockito
- Testcontainers

## Architecture

The initial architecture is documented in [ARCHITECTURE.md](ARCHITECTURE.md).

## MVP Features

- SaaS landing page
- Pricing page with one booking plan
- Barbershop owner registration and login
- Secure session-based authentication with HttpOnly cookies
- Barbershop dashboard
- Public barbershop profile
- Service management
- Availability management
- Public booking page
- Client booking creation
- Booking management
- Simulated subscription status for the first version

## Repository Structure

The planned repository structure is:

```text
barberflow-saas/
  backend/
  frontend/
  docs/
  docker-compose.yml
  README.md
  ARCHITECTURE.md
```

## Git Workflow

This project follows a simple Git workflow:

- `main` contains stable code and documentation
- Feature work is developed in short-lived branches
- Commit messages follow Conventional Commits

Example commit messages:

```text
docs: add initial architecture document
feature: add barbershop registration
fix: prevent overlapping bookings
test: add booking availability tests
chore: configure docker compose
```
