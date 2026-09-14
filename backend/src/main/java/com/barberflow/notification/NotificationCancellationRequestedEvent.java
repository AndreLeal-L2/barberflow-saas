package com.barberflow.notification;

import java.util.UUID;

record NotificationCancellationRequestedEvent(UUID notificationId) {
}
