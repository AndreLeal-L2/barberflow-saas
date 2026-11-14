-- Run as the owner of the Compasso application tables after Flyway completes.
-- Grant this role to a separate login with credentials managed by the operator.
BEGIN;

DO $$
DECLARE
    app_table text;
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'compasso_runtime') THEN
        CREATE ROLE compasso_runtime NOLOGIN NOINHERIT NOBYPASSRLS;
    END IF;

    GRANT USAGE ON SCHEMA public TO compasso_runtime;

    FOREACH app_table IN ARRAY ARRAY[
        'account_action_tokens', 'app_users', 'availability_rules', 'barbers',
        'barbershop_images', 'barbershop_services', 'barbershops', 'blocked_times',
        'bookings', 'notification_outbox', 'request_rate_limits', 'spring_session',
        'spring_session_attributes'
    ]
    LOOP
        EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO compasso_runtime', app_table);
        EXECUTE format('DROP POLICY IF EXISTS compasso_runtime_access ON public.%I', app_table);
        EXECUTE format(
            'CREATE POLICY compasso_runtime_access ON public.%I TO compasso_runtime USING (true) WITH CHECK (true)',
            app_table
        );
    END LOOP;
END
$$;

COMMIT;
