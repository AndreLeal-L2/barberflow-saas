package com.barberflow.notification;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "app.mail.delivery", havingValue = "smtp")
public class SmtpNotificationSender implements NotificationSender {

    private final JavaMailSender mailSender;
    private final String from;

    public SmtpNotificationSender(
            JavaMailSender mailSender,
            @Value("${app.mail.from}") String from
    ) {
        this.mailSender = mailSender;
        this.from = from;
    }

    @Override
    public NotificationSendResult send(NotificationOutbox notification) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(from);
        message.setTo(notification.getRecipient());
        message.setSubject(notification.getSubject());
        message.setText(notification.getBody());
        mailSender.send(message);
        return NotificationSendResult.sent(null);
    }
}
