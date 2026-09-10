ALTER TABLE barbershops
    ADD COLUMN published BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE barbers (
    id UUID PRIMARY KEY,
    barbershop_id UUID NOT NULL,
    name VARCHAR(120) NOT NULL,
    display_order INTEGER NOT NULL DEFAULT 0,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT fk_barbers_barbershop
        FOREIGN KEY (barbershop_id) REFERENCES barbershops (id),
    CONSTRAINT ck_barbers_display_order CHECK (display_order >= 0)
);

CREATE INDEX idx_barbers_barbershop_id ON barbers (barbershop_id);

INSERT INTO barbers (id, barbershop_id, name, display_order, active, created_at, updated_at)
SELECT gen_random_uuid(), u.barbershop_id, u.name, 0, TRUE, u.created_at, u.updated_at
FROM app_users u
WHERE u.role = 'OWNER'
  AND NOT EXISTS (
      SELECT 1 FROM barbers b WHERE b.barbershop_id = u.barbershop_id
  );

CREATE TABLE barbershop_services (
    id UUID PRIMARY KEY,
    barbershop_id UUID NOT NULL,
    name VARCHAR(120) NOT NULL,
    description VARCHAR(500),
    duration_minutes INTEGER NOT NULL,
    price_amount NUMERIC(10, 2) NOT NULL,
    price_currency VARCHAR(3) NOT NULL DEFAULT 'EUR',
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT fk_services_barbershop
        FOREIGN KEY (barbershop_id) REFERENCES barbershops (id),
    CONSTRAINT ck_services_duration CHECK (duration_minutes BETWEEN 15 AND 480),
    CONSTRAINT ck_services_price CHECK (price_amount >= 0)
);

CREATE INDEX idx_services_barbershop_id
    ON barbershop_services (barbershop_id);

CREATE TABLE availability_rules (
    id UUID PRIMARY KEY,
    barbershop_id UUID NOT NULL,
    barber_id UUID NOT NULL,
    day_of_week VARCHAR(10) NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT fk_availability_barbershop
        FOREIGN KEY (barbershop_id) REFERENCES barbershops (id),
    CONSTRAINT fk_availability_barber
        FOREIGN KEY (barber_id) REFERENCES barbers (id),
    CONSTRAINT uk_availability_barber_day UNIQUE (barber_id, day_of_week),
    CONSTRAINT ck_availability_day CHECK (
        day_of_week IN (
            'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY',
            'FRIDAY', 'SATURDAY', 'SUNDAY'
        )
    ),
    CONSTRAINT ck_availability_time CHECK (end_time > start_time)
);

CREATE INDEX idx_availability_barbershop_id
    ON availability_rules (barbershop_id);

CREATE TABLE bookings (
    id UUID PRIMARY KEY,
    barbershop_id UUID NOT NULL,
    barber_id UUID NOT NULL,
    service_id UUID NOT NULL,
    customer_name VARCHAR(120) NOT NULL,
    customer_phone VARCHAR(30) NOT NULL,
    customer_email VARCHAR(254),
    start_at TIMESTAMP NOT NULL,
    end_at TIMESTAMP NOT NULL,
    service_name_snapshot VARCHAR(120) NOT NULL,
    service_duration_snapshot INTEGER NOT NULL,
    service_price_snapshot NUMERIC(10, 2) NOT NULL,
    price_currency VARCHAR(3) NOT NULL,
    status VARCHAR(20) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT fk_bookings_barbershop
        FOREIGN KEY (barbershop_id) REFERENCES barbershops (id),
    CONSTRAINT fk_bookings_barber
        FOREIGN KEY (barber_id) REFERENCES barbers (id),
    CONSTRAINT fk_bookings_service
        FOREIGN KEY (service_id) REFERENCES barbershop_services (id),
    CONSTRAINT ck_bookings_time CHECK (end_at > start_at),
    CONSTRAINT ck_bookings_status CHECK (
        status IN ('CONFIRMED', 'CANCELLED', 'COMPLETED')
    )
);

CREATE INDEX idx_bookings_barbershop_start
    ON bookings (barbershop_id, start_at);

CREATE INDEX idx_bookings_barber_start
    ON bookings (barber_id, start_at);
