package com.barberflow.config;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

import com.barberflow.booking.BookingDataRetentionScheduler;
import com.barberflow.notification.NotificationOutboxScheduler;
import org.junit.jupiter.api.Test;

class MaintenanceJobControllerTest {

    @Test
    void shouldRejectRequestsWithoutTheConfiguredSecret() {
        BookingDataRetentionScheduler scheduler = mock(BookingDataRetentionScheduler.class);
        NotificationOutboxScheduler notificationScheduler = mock(NotificationOutboxScheduler.class);
        MaintenanceJobController controller = new MaintenanceJobController(
                scheduler,
                notificationScheduler,
                "test-secret"
        );

        assertThat(controller.runDataRetention(null).getStatusCode().value()).isEqualTo(401);
        assertThat(controller.runDataRetention("Bearer wrong-secret").getStatusCode().value())
                .isEqualTo(401);
        verifyNoInteractions(scheduler);
        verifyNoInteractions(notificationScheduler);
    }

    @Test
    void shouldRunDataRetentionForTheVercelCronSecret() {
        BookingDataRetentionScheduler scheduler = mock(BookingDataRetentionScheduler.class);
        NotificationOutboxScheduler notificationScheduler = mock(NotificationOutboxScheduler.class);
        MaintenanceJobController controller = new MaintenanceJobController(
                scheduler,
                notificationScheduler,
                "test-secret"
        );

        assertThat(controller.runDataRetention("Bearer test-secret").getStatusCode().value())
                .isEqualTo(204);
        verify(scheduler).removeExpiredPersonalData();
    }

    @Test
    void shouldRunNotificationDeliveryAndRetentionDuringMaintenance() {
        BookingDataRetentionScheduler scheduler = mock(BookingDataRetentionScheduler.class);
        NotificationOutboxScheduler notificationScheduler = mock(NotificationOutboxScheduler.class);
        MaintenanceJobController controller = new MaintenanceJobController(
                scheduler,
                notificationScheduler,
                "test-secret"
        );

        assertThat(controller.runMaintenance("Bearer test-secret").getStatusCode().value())
                .isEqualTo(204);
        verify(notificationScheduler).deliverPending();
        verify(scheduler).removeExpiredPersonalData();
    }
}
