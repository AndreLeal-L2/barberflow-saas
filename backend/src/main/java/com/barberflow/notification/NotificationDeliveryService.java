package com.barberflow.notification;

import java.time.Clock;
import java.time.Instant;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class NotificationDeliveryService {

    private static final Logger LOGGER = LoggerFactory.getLogger(NotificationDeliveryService.class);

    private final NotificationOutboxRepository repository;
    private final NotificationSender sender;
    private final Clock clock;

    public NotificationDeliveryService(
            NotificationOutboxRepository repository,
            NotificationSender sender,
            Clock clock
    ) {
        this.repository = repository;
        this.sender = sender;
        this.clock = clock;
    }

    @Transactional
    public void deliver(UUID notificationId) {
        NotificationOutbox notification = repository.findById(notificationId).orElse(null);
        if (notification == null) {
            return;
        }

        Instant now = Instant.now(clock);
        try {
            sender.send(notification);
            notification.markSent(now);
        } catch (RuntimeException exception) {
            notification.recordFailure(exception.getMessage(), now);
            LOGGER.warn(
                    "Notification delivery failed id={} type={}",
                    notification.getId(),
                    notification.getNotificationType(),
                    exception
            );
        }
    }
}
