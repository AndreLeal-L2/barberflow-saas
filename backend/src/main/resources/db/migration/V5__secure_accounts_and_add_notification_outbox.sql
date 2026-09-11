ALTER TABLE app_users
    ADD COLUMN email_verified BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE app_users
    ALTER COLUMN email_verified SET DEFAULT FALSE;

CREATE TABLE account_action_tokens (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    purpose VARCHAR(30) NOT NULL,
    token_hash CHAR(64) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    consumed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT fk_account_action_tokens_user
        FOREIGN KEY (user_id) REFERENCES app_users (id) ON DELETE CASCADE,
    CONSTRAINT uk_account_action_tokens_hash UNIQUE (token_hash),
    CONSTRAINT ck_account_action_tokens_purpose CHECK (
        purpose IN ('VERIFY_EMAIL', 'RESET_PASSWORD')
    )
);

CREATE INDEX idx_account_action_tokens_user_purpose
    ON account_action_tokens (user_id, purpose);

CREATE INDEX idx_account_action_tokens_expiry
    ON account_action_tokens (expires_at);

CREATE TABLE notification_outbox (
    id UUID PRIMARY KEY,
    notification_type VARCHAR(40) NOT NULL,
    recipient VARCHAR(254) NOT NULL,
    subject VARCHAR(200) NOT NULL,
    body TEXT NOT NULL,
    status VARCHAR(20) NOT NULL,
    attempt_count INTEGER NOT NULL DEFAULT 0,
    next_attempt_at TIMESTAMPTZ NOT NULL,
    last_error VARCHAR(500),
    created_at TIMESTAMPTZ NOT NULL,
    sent_at TIMESTAMPTZ,
    CONSTRAINT ck_notification_outbox_status CHECK (
        status IN ('PENDING', 'SENT', 'FAILED')
    ),
    CONSTRAINT ck_notification_outbox_attempts CHECK (attempt_count >= 0)
);

CREATE INDEX idx_notification_outbox_delivery
    ON notification_outbox (status, next_attempt_at, created_at);
