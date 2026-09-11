package com.barberflow.notification;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NotificationOutboxRepository extends JpaRepository<NotificationOutbox, UUID> {

    List<NotificationOutbox> findTop20ByStatusAndNextAttemptAtLessThanEqualOrderByCreatedAtAsc(
            NotificationStatus status,
            Instant now
    );

    Optional<NotificationOutbox> findFirstByNotificationTypeAndRecipientOrderByCreatedAtDesc(
            String notificationType,
            String recipient
    );

    void deleteAllByCreatedAtBeforeAndStatusIn(
            Instant createdAt,
            List<NotificationStatus> statuses
    );
}
