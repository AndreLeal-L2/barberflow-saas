package com.barberflow.notification;

import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class NotificationOutboxScheduler {

    private static final int MAX_BATCHES_PER_RUN = 5;

    private final NotificationOutboxRepository repository;
    private final NotificationDeliveryService deliveryService;
    private final Clock clock;

    public NotificationOutboxScheduler(
            NotificationOutboxRepository repository,
            NotificationDeliveryService deliveryService,
            Clock clock
    ) {
        this.repository = repository;
        this.deliveryService = deliveryService;
        this.clock = clock;
    }

    @Scheduled(
            fixedDelayString = "${app.mail.outbox-poll-delay}",
            initialDelayString = "${app.mail.outbox-poll-delay}"
    )
    public void deliverPending() {
        Instant now = Instant.now(clock);
        for (int batch = 0; batch < MAX_BATCHES_PER_RUN; batch++) {
            List<UUID> pendingIds = findPendingIds(now);
            List<UUID> cancellationIds = findCancellationIds(now);
            if (pendingIds.isEmpty() && cancellationIds.isEmpty()) {
                return;
            }
            pendingIds.forEach(deliveryService::deliver);
            cancellationIds.forEach(deliveryService::cancel);
        }
    }

    @Transactional(readOnly = true)
    List<UUID> findPendingIds(Instant now) {
        return repository
                .findTop20ByStatusAndNextAttemptAtLessThanEqualAndScheduledForLessThanEqualOrderByCreatedAtAsc(
                        NotificationStatus.PENDING,
                        now,
                        deliveryService.scheduleThrough(now)
                )
                .stream()
                .map(NotificationOutbox::getId)
                .toList();
    }

    @Transactional(readOnly = true)
    List<UUID> findCancellationIds(Instant now) {
        return repository
                .findTop20ByStatusAndNextAttemptAtLessThanEqualOrderByCreatedAtAsc(
                        NotificationStatus.CANCEL_PENDING,
                        now
                )
                .stream()
                .map(NotificationOutbox::getId)
                .toList();
    }
}
