package com.barberflow.config;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

import com.barberflow.booking.BookingDataRetentionScheduler;
import org.junit.jupiter.api.Test;

class MaintenanceJobControllerTest {

    @Test
    void shouldRejectRequestsWithoutTheConfiguredSecret() {
        BookingDataRetentionScheduler scheduler = mock(BookingDataRetentionScheduler.class);
        MaintenanceJobController controller = new MaintenanceJobController(scheduler, "test-secret");

        assertThat(controller.runDataRetention(null).getStatusCode().value()).isEqualTo(401);
        assertThat(controller.runDataRetention("Bearer wrong-secret").getStatusCode().value())
                .isEqualTo(401);
        verifyNoInteractions(scheduler);
    }

    @Test
    void shouldRunDataRetentionForTheVercelCronSecret() {
        BookingDataRetentionScheduler scheduler = mock(BookingDataRetentionScheduler.class);
        MaintenanceJobController controller = new MaintenanceJobController(scheduler, "test-secret");

        assertThat(controller.runDataRetention("Bearer test-secret").getStatusCode().value())
                .isEqualTo(204);
        verify(scheduler).removeExpiredPersonalData();
    }
}
