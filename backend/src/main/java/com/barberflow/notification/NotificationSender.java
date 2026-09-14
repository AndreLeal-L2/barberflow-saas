package com.barberflow.notification;

import java.time.Duration;

public interface NotificationSender {

    NotificationSendResult send(NotificationOutbox notification);

    default void cancel(String providerMessageId) {
        throw new UnsupportedOperationException("Este fornecedor não agenda notificações.");
    }

    default Duration schedulingHorizon() {
        return Duration.ZERO;
    }
}
