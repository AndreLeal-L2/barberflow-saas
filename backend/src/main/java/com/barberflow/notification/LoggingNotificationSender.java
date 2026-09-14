package com.barberflow.notification;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "app.mail.delivery", havingValue = "log", matchIfMissing = true)
public class LoggingNotificationSender implements NotificationSender {

    private static final Logger LOGGER = LoggerFactory.getLogger(LoggingNotificationSender.class);

    @Override
    public NotificationSendResult send(NotificationOutbox notification) {
        LOGGER.info(
                "Development email type={} recipient={} subject={} body={}",
                notification.getNotificationType(),
                notification.getRecipient(),
                notification.getSubject(),
                notification.getBody()
        );
        return NotificationSendResult.sent(null);
    }
}
