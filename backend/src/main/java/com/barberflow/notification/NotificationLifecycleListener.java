package com.barberflow.notification;

import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Component
class NotificationLifecycleListener {

    private final NotificationDeliveryService deliveryService;

    NotificationLifecycleListener(NotificationDeliveryService deliveryService) {
        this.deliveryService = deliveryService;
    }

    @TransactionalEventListener(
            phase = TransactionPhase.AFTER_COMMIT,
            fallbackExecution = true
    )
    void notificationQueued(NotificationQueuedEvent event) {
        deliveryService.deliver(event.notificationId());
    }

    @TransactionalEventListener(
            phase = TransactionPhase.AFTER_COMMIT,
            fallbackExecution = true
    )
    void notificationCancellationRequested(NotificationCancellationRequestedEvent event) {
        deliveryService.cancel(event.notificationId());
    }
}
