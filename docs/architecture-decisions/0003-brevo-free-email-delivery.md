# ADR-0003: Brevo Free Email Delivery

## Status

Accepted

## Context

The public portfolio deployment must send booking confirmations and reminders
without introducing a paid service. The Spring Boot backend runs on a Vercel
service that can scale to zero, so a reminder cannot depend on an in-memory Java
scheduler remaining active until the appointment.

Brevo Free currently provides transactional API access without a payment card
or time-limited trial. It imposes a daily sending allowance and may add Brevo
branding or replace an unauthenticated sender domain. Its API can schedule a
transactional email up to 72 hours ahead and cancel a scheduled message.

## Decision

Use a dedicated `BrevoNotificationSender` selected with
`BARBERFLOW_MAIL_DELIVERY=brevo`.

- Keep the API key exclusively in server-side environment variables.
- Submit immediate messages through the transactional email API.
- Use a conservative 71-hour scheduling horizon for 24-hour and 3-hour booking
  reminders.
- Keep later reminders in the transactional outbox until the daily authenticated
  maintenance job moves them inside the provider horizon.
- Store the Brevo message ID so a future reminder can be cancelled.
- Send a stable idempotency key based on the outbox record ID.
- Keep `log` delivery as the Vercel default until a Free account, sender, and API
  key have been configured.
- Do not implement billing, credit purchases, paid add-ons, or automatic plan
  changes.

## Consequences

- The project incurs no email-service charge while the Brevo account remains on
  Free and no paid option is manually enabled.
- Delivery stops or is delayed when the provider's free daily allowance is
  exhausted; the application does not buy additional capacity.
- Free-plan branding and a provider-managed sender domain are acceptable for the
  portfolio MVP but should be replaced by an authenticated project domain before
  commercial use.
- The 71-hour provider horizon requires the daily maintenance cron to remain
  configured and authenticated.
- Provider limits and plan terms are external constraints and must be reviewed
  before a commercial launch.
