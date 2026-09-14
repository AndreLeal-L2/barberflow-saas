package com.barberflow.notification;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.client.ExpectedCount.once;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.jsonPath;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

class ResendNotificationSenderTest {

    private static final Instant NOW = Instant.parse("2026-09-14T10:00:00Z");

    @Test
    void shouldCreateSenderWhenResendDeliveryIsSelected() {
        new ApplicationContextRunner()
                .withBean(Clock.class, () -> Clock.fixed(NOW, ZoneOffset.UTC))
                .withUserConfiguration(ResendNotificationSender.class)
                .withPropertyValues(
                        "app.mail.delivery=resend",
                        "app.mail.resend.api-key=re_test_key",
                        "app.mail.resend.base-url=https://api.resend.test",
                        "app.mail.from=BarberFlow <booking@example.com>"
                )
                .run(context -> assertThat(context)
                        .hasSingleBean(ResendNotificationSender.class));
    }

    @Test
    void shouldScheduleFutureEmailWithIdempotencyKey() {
        RestClient.Builder builder = RestClient.builder()
                .baseUrl("https://api.resend.test")
                .defaultHeader("Authorization", "Bearer test-key");
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        ResendNotificationSender sender = new ResendNotificationSender(
                builder.build(),
                Clock.fixed(NOW, ZoneOffset.UTC),
                "BarberFlow <booking@example.com>"
        );
        UUID notificationId = UUID.randomUUID();
        NotificationOutbox notification = NotificationOutbox.createScheduled(
                "BOOKING_REMINDER_24H",
                "client@example.com",
                "Appointment reminder",
                "Your appointment is tomorrow.",
                UUID.randomUUID(),
                Instant.parse("2026-09-15T10:00:00Z"),
                NOW
        );
        ReflectionTestUtils.setField(notification, "id", notificationId);

        server.expect(once(), requestTo("https://api.resend.test/emails"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(header("Authorization", "Bearer test-key"))
                .andExpect(header("Idempotency-Key", notificationId.toString()))
                .andExpect(jsonPath("$.from").value("BarberFlow <booking@example.com>"))
                .andExpect(jsonPath("$.to[0]").value("client@example.com"))
                .andExpect(jsonPath("$.scheduled_at").value("2026-09-15T10:00:00Z"))
                .andRespond(withSuccess("{\"id\":\"email-123\"}", MediaType.APPLICATION_JSON));

        NotificationSendResult result = sender.send(notification);

        assertThat(result).isEqualTo(NotificationSendResult.scheduled("email-123"));
        server.verify();
    }

    @Test
    void shouldSendImmediateEmailWithoutSchedulingField() {
        RestClient.Builder builder = RestClient.builder().baseUrl("https://api.resend.test");
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        ResendNotificationSender sender = new ResendNotificationSender(
                builder.build(),
                Clock.fixed(NOW, ZoneOffset.UTC),
                "BarberFlow <booking@example.com>"
        );
        UUID notificationId = UUID.randomUUID();
        NotificationOutbox notification = NotificationOutbox.create(
                "BOOKING_CONFIRMATION_CUSTOMER",
                "client@example.com",
                "Booking confirmed",
                "Your appointment is confirmed.",
                NOW
        );
        ReflectionTestUtils.setField(notification, "id", notificationId);

        server.expect(once(), requestTo("https://api.resend.test/emails"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(header("Idempotency-Key", notificationId.toString()))
                .andExpect(jsonPath("$.scheduled_at").doesNotExist())
                .andRespond(withSuccess("{\"id\":\"email-124\"}", MediaType.APPLICATION_JSON));

        NotificationSendResult result = sender.send(notification);

        assertThat(result).isEqualTo(NotificationSendResult.sent("email-124"));
        server.verify();
    }

    @Test
    void shouldCancelScheduledEmailByProviderId() {
        RestClient.Builder builder = RestClient.builder().baseUrl("https://api.resend.test");
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        ResendNotificationSender sender = new ResendNotificationSender(
                builder.build(),
                Clock.fixed(NOW, ZoneOffset.UTC),
                "BarberFlow <booking@example.com>"
        );
        server.expect(once(), requestTo("https://api.resend.test/emails/email-123/cancel"))
                .andExpect(method(HttpMethod.POST))
                .andRespond(withSuccess());

        sender.cancel("email-123");

        server.verify();
    }
}
