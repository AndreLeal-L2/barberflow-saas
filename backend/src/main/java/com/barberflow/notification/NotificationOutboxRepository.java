package com.barberflow.notification;

import jakarta.persistence.LockModeType;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface NotificationOutboxRepository extends JpaRepository<NotificationOutbox, UUID> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select notification from NotificationOutbox notification where notification.id = :id")
    Optional<NotificationOutbox> findByIdForDelivery(@Param("id") UUID id);

    List<NotificationOutbox> findTop20ByStatusAndNextAttemptAtLessThanEqualAndScheduledForLessThanEqualOrderByCreatedAtAsc(
            NotificationStatus status,
            Instant now,
            Instant scheduledThrough
    );

    List<NotificationOutbox> findTop20ByStatusAndNextAttemptAtLessThanEqualOrderByCreatedAtAsc(
            NotificationStatus status,
            Instant now
    );

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            select notification
            from NotificationOutbox notification
            where notification.bookingId = :bookingId
              and notification.notificationType in :notificationTypes
              and notification.scheduledFor > :now
              and notification.status in :statuses
            """)
    List<NotificationOutbox> findFutureBookingNotificationsForCancellation(
            @Param("bookingId") UUID bookingId,
            @Param("notificationTypes") List<String> notificationTypes,
            @Param("statuses") List<NotificationStatus> statuses,
            @Param("now") Instant now
    );

    Optional<NotificationOutbox> findFirstByNotificationTypeAndRecipientOrderByCreatedAtDesc(
            String notificationType,
            String recipient
    );

    void deleteAllByCreatedAtBeforeAndStatusIn(
            Instant createdAt,
            List<NotificationStatus> statuses
    );

    void deleteAllByStatusAndScheduledForBefore(
            NotificationStatus status,
            Instant scheduledFor
    );
}
