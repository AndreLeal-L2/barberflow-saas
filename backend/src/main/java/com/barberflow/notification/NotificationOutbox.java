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
            Instant now
    ) {
        this.notificationType = notificationType;
        this.recipient = recipient;
        this.subject = subject;
        this.body = body;
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
        return new NotificationOutbox(notificationType, recipient, subject, body, now);
    }

    public void markSent(Instant now) {
        status = NotificationStatus.SENT;
        sentAt = now;
        lastError = null;
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

    boolean isDeliverableAt(Instant now) {
        return status == NotificationStatus.PENDING && !nextAttemptAt.isAfter(now);
    }
}
