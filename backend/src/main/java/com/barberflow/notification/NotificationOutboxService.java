package com.barberflow.notification;

import java.time.Clock;
import java.time.Instant;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class NotificationOutboxService {

    private final NotificationOutboxRepository repository;
    private final Clock clock;

    public NotificationOutboxService(NotificationOutboxRepository repository, Clock clock) {
        this.repository = repository;
        this.clock = clock;
    }

    @Transactional
    public void enqueue(String type, String recipient, String subject, String body) {
        if (recipient == null || recipient.isBlank()) {
            return;
        }
        repository.save(NotificationOutbox.create(
                type,
                recipient.trim().toLowerCase(),
                subject,
                body,
                Instant.now(clock)
        ));
    }
}
