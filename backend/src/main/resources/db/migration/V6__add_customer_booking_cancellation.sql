ALTER TABLE bookings
    ADD COLUMN cancellation_token_hash CHAR(64),
    ADD COLUMN cancellation_token_expires_at TIMESTAMPTZ,
    ADD COLUMN customer_cancelled_at TIMESTAMPTZ,
    ADD COLUMN anonymized_at TIMESTAMPTZ;

ALTER TABLE bookings
    ADD CONSTRAINT uk_bookings_cancellation_token UNIQUE (cancellation_token_hash);

CREATE INDEX idx_bookings_cancellation_token
    ON bookings (cancellation_token_hash)
    WHERE cancellation_token_hash IS NOT NULL;

CREATE INDEX idx_bookings_retention
    ON bookings (end_at, anonymized_at);
