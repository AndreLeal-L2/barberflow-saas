ALTER TABLE notification_outbox
    ADD COLUMN booking_id UUID,
    ADD COLUMN scheduled_for TIMESTAMPTZ,
    ADD COLUMN provider_message_id VARCHAR(100),
    ADD CONSTRAINT fk_notification_outbox_booking
        FOREIGN KEY (booking_id) REFERENCES bookings (id) ON DELETE CASCADE;

UPDATE notification_outbox
SET scheduled_for = created_at
WHERE scheduled_for IS NULL;

ALTER TABLE notification_outbox
    ALTER COLUMN scheduled_for SET NOT NULL;

ALTER TABLE notification_outbox
    DROP CONSTRAINT ck_notification_outbox_status;

ALTER TABLE notification_outbox
    ADD CONSTRAINT ck_notification_outbox_status CHECK (
        status IN ('PENDING', 'SCHEDULED', 'SENT', 'CANCEL_PENDING', 'CANCELLED', 'FAILED')
    );

DROP INDEX idx_notification_outbox_delivery;

CREATE INDEX idx_notification_outbox_delivery
    ON notification_outbox (status, next_attempt_at, scheduled_for, created_at);

CREATE INDEX idx_notification_outbox_booking
    ON notification_outbox (booking_id, status, scheduled_for);

CREATE UNIQUE INDEX uk_notification_outbox_booking_reminder
    ON notification_outbox (booking_id, notification_type)
    WHERE booking_id IS NOT NULL
      AND notification_type IN ('BOOKING_REMINDER_24H', 'BOOKING_REMINDER_3H');
