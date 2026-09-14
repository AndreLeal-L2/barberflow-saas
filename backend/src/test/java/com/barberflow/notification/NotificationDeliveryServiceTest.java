package com.barberflow.notification;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Clock;
import java.time.Duration;
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
        when(sender.schedulingHorizon()).thenReturn(Duration.ZERO);
        when(sender.send(notification)).thenReturn(NotificationSendResult.sent("email-1"));

        deliveryService(repository, sender).deliver(notificationId);

        verify(repository).findByIdForDelivery(notificationId);
        verify(sender).send(notification);
        assertThat(notification.getStatus()).isEqualTo(NotificationStatus.SENT);
        assertThat(notification.getProviderMessageId()).isEqualTo("email-1");
    }

    @Test
    void shouldNotRedeliverANotificationCompletedByAnotherInstance() {
        NotificationOutboxRepository repository = mock(NotificationOutboxRepository.class);
        NotificationSender sender = mock(NotificationSender.class);
        NotificationOutbox notification = pendingNotification();
        notification.markSent(NOW);
        UUID notificationId = UUID.randomUUID();
        when(repository.findByIdForDelivery(notificationId)).thenReturn(Optional.of(notification));
        when(sender.schedulingHorizon()).thenReturn(Duration.ZERO);

        deliveryService(repository, sender).deliver(notificationId);

        verify(sender, never()).send(notification);
    }

    @Test
    void shouldSubmitFutureNotificationWhenProviderSupportsScheduling() {
        NotificationOutboxRepository repository = mock(NotificationOutboxRepository.class);
        NotificationSender sender = mock(NotificationSender.class);
        NotificationOutbox notification = NotificationOutbox.createScheduled(
                "BOOKING_REMINDER_24H",
                "client@example.com",
                "Appointment reminder",
                "Your appointment is tomorrow.",
                UUID.randomUUID(),
                NOW.plus(Duration.ofHours(4)),
                NOW
        );
        UUID notificationId = UUID.randomUUID();
        when(repository.findByIdForDelivery(notificationId)).thenReturn(Optional.of(notification));
        when(sender.schedulingHorizon()).thenReturn(Duration.ofDays(29));
        when(sender.send(notification)).thenReturn(NotificationSendResult.scheduled("email-2"));

        deliveryService(repository, sender).deliver(notificationId);

        verify(sender).send(notification);
        assertThat(notification.getStatus()).isEqualTo(NotificationStatus.SCHEDULED);
    }

    @Test
    void shouldCancelNotificationAlreadyScheduledAtProvider() {
        NotificationOutboxRepository repository = mock(NotificationOutboxRepository.class);
        NotificationSender sender = mock(NotificationSender.class);
        NotificationOutbox notification = NotificationOutbox.createScheduled(
                "BOOKING_REMINDER_3H",
                "client@example.com",
                "Appointment reminder",
                "Your appointment starts in three hours.",
                UUID.randomUUID(),
                NOW.plus(Duration.ofHours(3)),
                NOW
        );
        notification.markSubmitted(NotificationSendResult.scheduled("email-3"), NOW);
        notification.requestCancellation(NOW);
        UUID notificationId = UUID.randomUUID();
        when(repository.findByIdForDelivery(notificationId)).thenReturn(Optional.of(notification));

        deliveryService(repository, sender).cancel(notificationId);

        verify(sender).cancel("email-3");
        assertThat(notification.getStatus()).isEqualTo(NotificationStatus.CANCELLED);
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
