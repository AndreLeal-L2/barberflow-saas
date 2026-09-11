ALTER TABLE account_action_tokens
    ALTER COLUMN token_hash TYPE VARCHAR(64);

ALTER TABLE bookings
    ALTER COLUMN cancellation_token_hash TYPE VARCHAR(64);
