package com.barberflow.config;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.jdbc.core.JdbcTemplate;
import org.testcontainers.postgresql.PostgreSQLContainer;
import org.testcontainers.utility.DockerImageName;

@SpringBootTest
@Import(SupabaseDefaultPrivilegesIntegrationTests.DatabaseConfiguration.class)
class SupabaseDefaultPrivilegesIntegrationTests {

    @Autowired private JdbcTemplate jdbc;

    @Test
    void existingApplicationTablesAreNotReadableThroughTheSupabaseServiceRole() {
        assertThat(jdbc.queryForObject(
                "SELECT has_table_privilege('service_role', 'public.bookings', 'SELECT')",
                Boolean.class
        )).isFalse();
    }

    @Test
    void futureApplicationTablesDoNotBecomePublicThroughSupabaseDefaults() {
        jdbc.execute("CREATE TABLE security_future_probe (id INTEGER PRIMARY KEY)");
        try {
            assertThat(jdbc.queryForObject(
                    "SELECT has_table_privilege('anon', 'public.security_future_probe', 'SELECT')",
                    Boolean.class
            )).isFalse();
            assertThat(jdbc.queryForObject(
                    "SELECT has_table_privilege('authenticated', 'public.security_future_probe', 'INSERT')",
                    Boolean.class
            )).isFalse();
        } finally {
            jdbc.execute("DROP TABLE security_future_probe");
        }
    }

    @TestConfiguration(proxyBeanMethods = false)
    static class DatabaseConfiguration {
        @Bean
        @ServiceConnection
        PostgreSQLContainer postgresContainer() {
            return new PostgreSQLContainer(DockerImageName.parse("postgres:17-alpine"))
                    .withInitScript("db/supabase-default-privileges.sql");
        }
    }
}
