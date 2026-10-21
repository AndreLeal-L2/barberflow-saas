package com.barberflow.notification;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;
import org.springframework.test.util.ReflectionTestUtils;

class NotificationDeliveryServiceTest {

    private static final Instant NOW = Instant.parse("2026-09-13T18:00:00Z");

    @Test
    void doesNotLogOrStoreSensitiveProviderErrorDetails() {
        NotificationOutboxRepository repository = mock(NotificationOutboxRepository.class);
        NotificationSender sender = mock(NotificationSender.class);
        NotificationOutbox notification = pendingNotification();
        UUID notificationId = UUID.randomUUID();
        when(repository.findByIdForDelivery(notificationId)).thenReturn(Optional.of(notification));
        when(sender.schedulingHorizon()).thenReturn(Duration.ZERO);
        when(sender.send(notification)).thenThrow(new IllegalStateException(
                "provider rejected private-owner@example.test token=synthetic-secret-token"));
        Logger logger = (Logger) LoggerFactory.getLogger(NotificationDeliveryService.class);
        ListAppender<ILoggingEvent> appender = new ListAppender<>();
        appender.start();
        logger.addAppender(appender);
        try {
            deliveryService(repository, sender).deliver(notificationId);

            String logged = appender.list.stream()
                    .map(event -> event.getFormattedMessage() + " "
                            + (event.getThrowableProxy() == null ? "" : event.getThrowableProxy().getMessage()))
                    .reduce("", String::concat);
            assertThat(logged).doesNotContain("private-owner@example.test", "synthetic-secret-token");
            assertThat((String) ReflectionTestUtils.getField(notification, "lastError"))
                    .doesNotContain("private-owner@example.test", "synthetic-secret-token");
        } finally {
            logger.detachAppender(appender);
            appender.stop();
        }
    }

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
