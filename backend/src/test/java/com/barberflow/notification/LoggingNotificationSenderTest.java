package com.barberflow.notification;

import static org.assertj.core.api.Assertions.assertThat;

import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import java.time.Instant;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;

class LoggingNotificationSenderTest {

    @Test
    void doesNotWriteRecipientsOrActionTokensToApplicationLogs() {
        Logger logger = (Logger) LoggerFactory.getLogger(LoggingNotificationSender.class);
        ListAppender<ILoggingEvent> appender = new ListAppender<>();
        appender.start();
        logger.addAppender(appender);
        try {
            NotificationOutbox notification = NotificationOutbox.create(
                    "RESET_PASSWORD",
                    "private-owner@example.test",
                    "Recuperar palavra-passe",
                    "https://example.test/reset-password?token=synthetic-secret-token",
                    Instant.parse("2026-10-21T12:00:00Z")
            );

            new LoggingNotificationSender().send(notification);

            String logged = appender.list.stream()
                    .map(ILoggingEvent::getFormattedMessage)
                    .reduce("", String::concat);
            assertThat(logged).doesNotContain("private-owner@example.test", "synthetic-secret-token");
        } finally {
            logger.detachAppender(appender);
            appender.stop();
        }
    }
}
