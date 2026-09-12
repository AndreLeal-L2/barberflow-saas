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
        findPendingIds().forEach(deliveryService::deliver);
    }

    @Transactional(readOnly = true)
    List<UUID> findPendingIds() {
        return repository
                .findTop20ByStatusAndNextAttemptAtLessThanEqualOrderByCreatedAtAsc(
                        NotificationStatus.PENDING,
                        Instant.now(clock)
                )
                .stream()
                .map(NotificationOutbox::getId)
                .toList();
    }
}
