ALTER TABLE barbershops ADD COLUMN logo_version UUID;
ALTER TABLE barbershops ADD COLUMN cover_version UUID;

CREATE TABLE barbershop_images (
    id VARCHAR(48) PRIMARY KEY,
    barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
    kind VARCHAR(5) NOT NULL CHECK (kind IN ('logo', 'cover')),
    image_data BYTEA NOT NULL CHECK (octet_length(image_data) <= 5242880),
    CONSTRAINT uq_barbershop_image_kind UNIQUE (barbershop_id, kind)
);
ALTER TABLE barbershop_images ENABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON barbershop_images FROM PUBLIC;
DO $$
DECLARE api_role TEXT;
BEGIN
    FOR api_role IN SELECT rolname FROM pg_roles WHERE rolname IN ('anon', 'authenticated', 'service_role') LOOP
        EXECUTE format('REVOKE ALL PRIVILEGES ON barbershop_images FROM %I', api_role);
    END LOOP;
END
$$;
