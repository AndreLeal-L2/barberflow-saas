package com.barberflow.notification;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class NotificationDeliveryServiceTest {

    private static final Instant NOW = Instant.parse("2026-09-13T18:00:00Z");

    @Test
    void shouldLockAndDeliverAPendingNotification() {
        NotificationOutboxRepository repository = mock(NotificationOutboxRepository.class);
        NotificationSender sender = mock(NotificationSender.class);
        NotificationOutbox notification = pendingNotification();
        UUID notificationId = UUID.randomUUID();
        when(repository.findByIdForDelivery(notificationId)).thenReturn(Optional.of(notification));

        deliveryService(repository, sender).deliver(notificationId);

        verify(repository).findByIdForDelivery(notificationId);
        verify(sender).send(notification);
    }

    @Test
    void shouldNotRedeliverANotificationCompletedByAnotherInstance() {
        NotificationOutboxRepository repository = mock(NotificationOutboxRepository.class);
        NotificationSender sender = mock(NotificationSender.class);
        NotificationOutbox notification = pendingNotification();
        notification.markSent(NOW);
        UUID notificationId = UUID.randomUUID();
        when(repository.findByIdForDelivery(notificationId)).thenReturn(Optional.of(notification));

        deliveryService(repository, sender).deliver(notificationId);

        verify(sender, never()).send(notification);
    }

    private NotificationDeliveryService deliveryService(
            NotificationOutboxRepository repository,
            NotificationSender sender
    ) {
        return new NotificationDeliveryService(
                repository,
                sender,
                Clock.fixed(NOW, ZoneOffset.UTC)
        );
    }

    private NotificationOutbox pendingNotification() {
        return NotificationOutbox.create(
                "BOOKING_CREATED",
                "client@example.com",
                "Booking confirmed",
                "Your appointment is confirmed.",
                NOW
        );
    }
}
