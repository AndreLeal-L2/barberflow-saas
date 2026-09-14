package com.barberflow.notification;

public record NotificationSendResult(String providerMessageId, boolean scheduled) {

    public static NotificationSendResult sent(String providerMessageId) {
        return new NotificationSendResult(providerMessageId, false);
    }

    public static NotificationSendResult scheduled(String providerMessageId) {
        return new NotificationSendResult(providerMessageId, true);
    }
}
