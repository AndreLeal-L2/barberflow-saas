package com.barberflow.notification;

import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class NotificationOutboxService {

    private final NotificationOutboxRepository repository;
    private final Clock clock;
    private final ApplicationEventPublisher eventPublisher;

    public NotificationOutboxService(
            NotificationOutboxRepository repository,
            Clock clock,
            ApplicationEventPublisher eventPublisher
    ) {
        this.repository = repository;
        this.clock = clock;
        this.eventPublisher = eventPublisher;
    }

    @Transactional
    public UUID enqueue(String type, String recipient, String subject, String body) {
        Instant now = Instant.now(clock);
        return enqueue(type, recipient, subject, body, null, now, now);
    }

    @Transactional
    public UUID enqueueForBooking(
            String type,
            String recipient,
            String subject,
            String body,
            UUID bookingId,
            Instant scheduledFor
    ) {
        Instant now = Instant.now(clock);
        return enqueue(type, recipient, subject, body, bookingId, scheduledFor, now);
    }

    @Transactional
    public void cancelFutureBookingReminders(UUID bookingId) {
        Instant now = Instant.now(clock);
        List<NotificationOutbox> notifications =
                repository.findFutureBookingNotificationsForCancellation(
                        bookingId,
                        List.of("BOOKING_REMINDER_24H", "BOOKING_REMINDER_3H"),
                        List.of(NotificationStatus.PENDING, NotificationStatus.SCHEDULED),
                        now
                );

        notifications.forEach(notification -> {
            if (notification.requestCancellation(now)) {
                eventPublisher.publishEvent(
                        new NotificationCancellationRequestedEvent(notification.getId())
                );
            }
        });
    }

    private UUID enqueue(
            String type,
            String recipient,
            String subject,
            String body,
            UUID bookingId,
            Instant scheduledFor,
            Instant now
    ) {
        if (recipient == null || recipient.isBlank()) {
            return null;
        }
        NotificationOutbox notification = repository.save(NotificationOutbox.createScheduled(
                type,
                recipient.trim().toLowerCase(Locale.ROOT),
                subject,
                body,
                bookingId,
                scheduledFor,
                now
        ));
        eventPublisher.publishEvent(new NotificationQueuedEvent(notification.getId()));
        return notification.getId();
    }
}
