DO $$
DECLARE
    public_role TEXT;
BEGIN
    FOR public_role IN
        SELECT rolname FROM pg_roles
        WHERE rolname IN ('anon', 'authenticated', 'service_role')
    LOOP
        EXECUTE format(
            'ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM %I',
            public_role
        );
        EXECUTE format(
            'ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM %I',
            public_role
        );
        EXECUTE format(
            'ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM %I',
            public_role
        );
    END LOOP;
END
$$;

ALTER DEFAULT PRIVILEGES REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

ALTER TABLE bookings
    ADD COLUMN version BIGINT NOT NULL DEFAULT 0;

CREATE TABLE request_rate_limits (
    bucket_key VARCHAR(100) PRIMARY KEY,
    capacity INTEGER NOT NULL,
    refill_period_ms BIGINT NOT NULL,
    tokens DOUBLE PRECISION NOT NULL,
    last_refill_ms BIGINT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT ck_request_rate_limits_capacity CHECK (capacity > 0),
    CONSTRAINT ck_request_rate_limits_refill CHECK (refill_period_ms > 0)
);

CREATE INDEX idx_request_rate_limits_expiry ON request_rate_limits (expires_at);
ALTER TABLE request_rate_limits ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
        REVOKE ALL PRIVILEGES ON request_rate_limits FROM anon;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
        REVOKE ALL PRIVILEGES ON request_rate_limits FROM authenticated;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
        REVOKE ALL PRIVILEGES ON request_rate_limits FROM service_role;
    END IF;
END
$$;
