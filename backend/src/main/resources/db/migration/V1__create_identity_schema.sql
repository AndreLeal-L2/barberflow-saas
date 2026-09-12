CREATE TABLE barbershops (
    id UUID PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    slug VARCHAR(80) NOT NULL,
    phone VARCHAR(30) NOT NULL,
    email VARCHAR(254) NOT NULL,
    public_description VARCHAR(500),
    public_address VARCHAR(255),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    subscription_status VARCHAR(20) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT uk_barbershops_slug UNIQUE (slug),
    CONSTRAINT ck_barbershops_subscription_status CHECK (
        subscription_status IN ('TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELLED')
    )
);

CREATE TABLE app_users (
    id UUID PRIMARY KEY,
    barbershop_id UUID NOT NULL,
    name VARCHAR(120) NOT NULL,
    email VARCHAR(254) NOT NULL,
    password_hash VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT fk_app_users_barbershop
        FOREIGN KEY (barbershop_id) REFERENCES barbershops (id),
    CONSTRAINT uk_app_users_email UNIQUE (email),
    CONSTRAINT ck_app_users_role CHECK (role IN ('OWNER'))
);

CREATE INDEX idx_app_users_barbershop_id ON app_users (barbershop_id);
