package com.barberflow.config;

import com.barberflow.booking.BookingDataRetentionScheduler;
import com.barberflow.notification.NotificationOutboxScheduler;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/internal/jobs")
public class MaintenanceJobController {

    private final BookingDataRetentionScheduler dataRetentionScheduler;
    private final NotificationOutboxScheduler notificationOutboxScheduler;
    private final byte[] expectedAuthorization;
    private final boolean enabled;

    public MaintenanceJobController(
            BookingDataRetentionScheduler dataRetentionScheduler,
            NotificationOutboxScheduler notificationOutboxScheduler,
            @Value("${app.jobs.cron-secret:}") String cronSecret
    ) {
        this.dataRetentionScheduler = dataRetentionScheduler;
        this.notificationOutboxScheduler = notificationOutboxScheduler;
        this.enabled = !cronSecret.isBlank();
        this.expectedAuthorization = ("Bearer " + cronSecret)
                .getBytes(StandardCharsets.UTF_8);
    }

    @GetMapping("/maintenance")
    public ResponseEntity<Void> runMaintenance(
            @RequestHeader(name = HttpHeaders.AUTHORIZATION, required = false)
            String authorization
    ) {
        if (!isAuthorized(authorization)) {
            return ResponseEntity.status(401).build();
        }

        notificationOutboxScheduler.deliverPending();
        dataRetentionScheduler.removeExpiredPersonalData();
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/data-retention")
    public ResponseEntity<Void> runDataRetention(
            @RequestHeader(name = HttpHeaders.AUTHORIZATION, required = false)
            String authorization
    ) {
        if (!isAuthorized(authorization)) {
            return ResponseEntity.status(401).build();
        }

        dataRetentionScheduler.removeExpiredPersonalData();
        return ResponseEntity.noContent().build();
    }

    private boolean isAuthorized(String authorization) {
        return enabled
                && authorization != null
                && MessageDigest.isEqual(
                        expectedAuthorization,
                        authorization.getBytes(StandardCharsets.UTF_8)
                );
    }
}
