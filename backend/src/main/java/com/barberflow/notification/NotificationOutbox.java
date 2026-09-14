package com.barberflow.notification;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

@Entity
@Table(name = "notification_outbox")
public class NotificationOutbox {

    private static final int MAX_ATTEMPTS = 5;

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "notification_type", nullable = false, length = 40)
    private String notificationType;

    @Column(nullable = false, length = 254)
    private String recipient;

    @Column(nullable = false, length = 200)
    private String subject;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String body;

    @Column(name = "booking_id")
    private UUID bookingId;

    @Column(name = "scheduled_for", nullable = false)
    private Instant scheduledFor;

    @Column(name = "provider_message_id", length = 100)
    private String providerMessageId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private NotificationStatus status;

    @Column(name = "attempt_count", nullable = false)
    private int attemptCount;

    @Column(name = "next_attempt_at", nullable = false)
    private Instant nextAttemptAt;

    @Column(name = "last_error", length = 500)
    private String lastError;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "sent_at")
    private Instant sentAt;

    protected NotificationOutbox() {
    }

    private NotificationOutbox(
            String notificationType,
            String recipient,
            String subject,
            String body,
            UUID bookingId,
            Instant scheduledFor,
            Instant now
    ) {
        this.notificationType = notificationType;
        this.recipient = recipient;
        this.subject = subject;
        this.body = body;
        this.bookingId = bookingId;
        this.scheduledFor = scheduledFor;
        this.status = NotificationStatus.PENDING;
        this.nextAttemptAt = now;
        this.createdAt = now;
    }

    public static NotificationOutbox create(
            String notificationType,
            String recipient,
            String subject,
            String body,
            Instant now
    ) {
        return createScheduled(notificationType, recipient, subject, body, null, now, now);
    }

    public static NotificationOutbox createScheduled(
            String notificationType,
            String recipient,
            String subject,
            String body,
            UUID bookingId,
            Instant scheduledFor,
            Instant now
    ) {
        return new NotificationOutbox(
                notificationType,
                recipient,
                subject,
                body,
                bookingId,
                scheduledFor,
                now
        );
    }

    public void markSent(Instant now) {
        status = NotificationStatus.SENT;
        sentAt = now;
        lastError = null;
    }

    public void markSubmitted(NotificationSendResult result, Instant now) {
        providerMessageId = result.providerMessageId();
        lastError = null;
        if (result.scheduled()) {
            if (providerMessageId == null || providerMessageId.isBlank()) {
                throw new IllegalArgumentException(
                        "O fornecedor deve devolver o identificador da mensagem agendada."
                );
            }
            status = NotificationStatus.SCHEDULED;
            return;
        }
        markSent(now);
    }

    public void recordFailure(String error, Instant now) {
        attemptCount++;
        lastError = truncate(error);
        if (attemptCount >= MAX_ATTEMPTS) {
            status = NotificationStatus.FAILED;
            return;
        }
        long delayMinutes = Math.min(60, 1L << attemptCount);
        nextAttemptAt = now.plus(delayMinutes, ChronoUnit.MINUTES);
    }

    public boolean requestCancellation(Instant now) {
        if (status == NotificationStatus.PENDING) {
            markCancelled();
            return false;
        }
        if (status == NotificationStatus.SCHEDULED && providerMessageId != null) {
            status = NotificationStatus.CANCEL_PENDING;
            attemptCount = 0;
            nextAttemptAt = now;
            lastError = null;
            return true;
        }
        return false;
    }

    public void markCancelled() {
        status = NotificationStatus.CANCELLED;
        lastError = null;
    }

    public void recordCancellationFailure(String error, Instant now) {
        recordFailure(error, now);
        if (status != NotificationStatus.FAILED) {
            status = NotificationStatus.CANCEL_PENDING;
        }
    }

    private static String truncate(String value) {
        if (value == null || value.isBlank()) {
            return "Falha de entrega sem detalhes.";
        }
        return value.length() <= 500 ? value : value.substring(0, 500);
    }

    public UUID getId() {
        return id;
    }

    public String getNotificationType() {
        return notificationType;
    }

    public String getRecipient() {
        return recipient;
    }

    public String getSubject() {
        return subject;
    }

    public String getBody() {
        return body;
    }

    boolean isDeliverableAt(Instant now, Instant scheduledThrough) {
        return status == NotificationStatus.PENDING
                && !nextAttemptAt.isAfter(now)
                && !scheduledFor.isAfter(scheduledThrough);
    }

    boolean isCancellationDeliverableAt(Instant now) {
        return status == NotificationStatus.CANCEL_PENDING && !nextAttemptAt.isAfter(now);
    }

    public UUID getBookingId() {
        return bookingId;
    }

    public Instant getScheduledFor() {
        return scheduledFor;
    }

    public String getProviderMessageId() {
        return providerMessageId;
    }

    public NotificationStatus getStatus() {
        return status;
    }
}
