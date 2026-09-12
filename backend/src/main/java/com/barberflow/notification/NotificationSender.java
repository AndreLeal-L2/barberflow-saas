package com.barberflow.notification;

public interface NotificationSender {
    void send(NotificationOutbox notification);
}
