package com.barberflow.booking;

import com.barberflow.auth.AccountActionTokenRepository;
import com.barberflow.notification.NotificationOutboxRepository;
import com.barberflow.notification.NotificationStatus;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class BookingDataRetentionScheduler {

    private static final int NOTIFICATION_RETENTION_DAYS = 30;

    private final BookingRepository bookingRepository;
    private final AccountActionTokenRepository accountTokenRepository;
    private final NotificationOutboxRepository notificationRepository;
    private final Clock clock;
    private final int retentionDays;

    public BookingDataRetentionScheduler(
            BookingRepository bookingRepository,
            AccountActionTokenRepository accountTokenRepository,
            NotificationOutboxRepository notificationRepository,
            Clock clock,
            @Value("${app.booking.personal-data-retention-days}") int retentionDays
    ) {
        this.bookingRepository = bookingRepository;
        this.accountTokenRepository = accountTokenRepository;
        this.notificationRepository = notificationRepository;
        this.clock = clock;
        this.retentionDays = retentionDays;
    }

    @Scheduled(cron = "0 15 3 * * *", zone = "${app.time-zone}")
    @Transactional
    public void removeExpiredPersonalData() {
        Instant now = Instant.now(clock);
        LocalDateTime bookingCutoff = LocalDateTime.now(clock).minusDays(retentionDays);
        bookingRepository.anonymizeExpiredPersonalData(bookingCutoff, now);

        accountTokenRepository.deleteAllByExpiresAtBefore(now);
        notificationRepository.deleteAllByCreatedAtBeforeAndStatusIn(
                now.minus(NOTIFICATION_RETENTION_DAYS, ChronoUnit.DAYS),
                List.of(NotificationStatus.SENT, NotificationStatus.FAILED)
        );
    }
}
