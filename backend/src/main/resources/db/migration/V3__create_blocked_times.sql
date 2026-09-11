CREATE TABLE blocked_times (
    id UUID PRIMARY KEY,
    barbershop_id UUID NOT NULL,
    barber_id UUID NOT NULL,
    start_at TIMESTAMP NOT NULL,
    end_at TIMESTAMP NOT NULL,
    reason VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT fk_blocked_times_barbershop
        FOREIGN KEY (barbershop_id) REFERENCES barbershops (id),
    CONSTRAINT fk_blocked_times_barber
        FOREIGN KEY (barber_id) REFERENCES barbers (id),
    CONSTRAINT ck_blocked_times_range CHECK (end_at > start_at)
);

CREATE INDEX idx_blocked_times_barber_range
    ON blocked_times (barber_id, start_at, end_at);

CREATE INDEX idx_blocked_times_barbershop_start
    ON blocked_times (barbershop_id, start_at);
