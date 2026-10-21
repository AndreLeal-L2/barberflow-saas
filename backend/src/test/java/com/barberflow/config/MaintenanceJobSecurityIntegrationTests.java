package com.barberflow.config;

import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.barberflow.TestcontainersConfiguration;
import com.barberflow.booking.BookingDataRetentionScheduler;
import com.barberflow.notification.NotificationOutboxScheduler;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@Import(TestcontainersConfiguration.class)
@SpringBootTest(properties = "app.jobs.cron-secret=synthetic-test-secret")
@AutoConfigureMockMvc
class MaintenanceJobSecurityIntegrationTests {

    @Autowired private MockMvc mockMvc;
    @MockitoBean private BookingDataRetentionScheduler dataRetentionScheduler;
    @MockitoBean private NotificationOutboxScheduler notificationOutboxScheduler;

    @Test
    void acceptsTheConfiguredCronSecretWithoutAUserSession() throws Exception {
        mockMvc.perform(get("/api/internal/jobs/maintenance")
                        .header("Authorization", "Bearer synthetic-test-secret"))
                .andExpect(status().isNoContent());

        verify(notificationOutboxScheduler).deliverPending();
        verify(dataRetentionScheduler).removeExpiredPersonalData();
    }
}
