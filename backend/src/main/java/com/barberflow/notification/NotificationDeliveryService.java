package com.barberflow.notification;

import java.time.Clock;
import java.time.Instant;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
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

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void deliver(UUID notificationId) {
        NotificationOutbox notification = repository.findByIdForDelivery(notificationId).orElse(null);
        Instant now = Instant.now(clock);
        if (notification == null || !notification.isDeliverableAt(now, scheduleThrough(now))) {
            return;
        }

        try {
            NotificationSendResult result = sender.send(notification);
            notification.markSubmitted(result, now);
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

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void cancel(UUID notificationId) {
        NotificationOutbox notification = repository.findByIdForDelivery(notificationId).orElse(null);
        Instant now = Instant.now(clock);
        if (notification == null || !notification.isCancellationDeliverableAt(now)) {
            return;
        }

        try {
            sender.cancel(notification.getProviderMessageId());
            notification.markCancelled();
        } catch (RuntimeException exception) {
            notification.recordCancellationFailure(exception.getMessage(), now);
            LOGGER.warn(
                    "Scheduled notification cancellation failed id={} type={}",
                    notification.getId(),
                    notification.getNotificationType(),
                    exception
            );
        }
    }

    Instant scheduleThrough(Instant now) {
        return now.plus(sender.schedulingHorizon());
    }
}
