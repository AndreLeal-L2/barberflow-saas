package com.barberflow.booking;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

import com.barberflow.auth.AccountActionTokenRepository;
import com.barberflow.notification.NotificationOutboxRepository;
import com.barberflow.notification.NotificationStatus;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.List;
import org.junit.jupiter.api.Test;

class BookingDataRetentionSchedulerTest {

    @Test
    void shouldKeepProviderScheduledMessagesUntilThirtyDaysAfterDelivery() {
        Instant now = Instant.parse("2026-09-14T10:00:00Z");
        Clock clock = Clock.fixed(now, ZoneId.of("Europe/Lisbon"));
        BookingRepository bookingRepository = mock(BookingRepository.class);
        AccountActionTokenRepository tokenRepository = mock(AccountActionTokenRepository.class);
        NotificationOutboxRepository notificationRepository =
                mock(NotificationOutboxRepository.class);
        BookingDataRetentionScheduler scheduler = new BookingDataRetentionScheduler(
                bookingRepository,
                tokenRepository,
                notificationRepository,
                clock,
                365
        );

        scheduler.removeExpiredPersonalData();

        Instant notificationCutoff = now.minus(30, ChronoUnit.DAYS);
        verify(bookingRepository).anonymizeExpiredPersonalData(
                LocalDateTime.of(2025, 9, 14, 11, 0),
                now
        );
        verify(tokenRepository).deleteAllByExpiresAtBefore(now);
        verify(notificationRepository).deleteAllByCreatedAtBeforeAndStatusIn(
                notificationCutoff,
                List.of(
                        NotificationStatus.SENT,
                        NotificationStatus.CANCELLED,
                        NotificationStatus.FAILED
                )
        );
        verify(notificationRepository).deleteAllByStatusAndScheduledForBefore(
                NotificationStatus.SCHEDULED,
                notificationCutoff
        );
    }
}
