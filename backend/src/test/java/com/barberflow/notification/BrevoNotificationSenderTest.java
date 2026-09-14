package com.barberflow.notification;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.client.ExpectedCount.once;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.jsonPath;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

import java.time.Clock;
import java.time.Duration;
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

class BrevoNotificationSenderTest {

    private static final Instant NOW = Instant.parse("2026-09-14T10:00:00Z");

    @Test
    void shouldCreateSenderWhenBrevoDeliveryIsSelected() {
        new ApplicationContextRunner()
                .withBean(Clock.class, () -> Clock.fixed(NOW, ZoneOffset.UTC))
                .withUserConfiguration(BrevoNotificationSender.class)
                .withPropertyValues(
                        "app.mail.delivery=brevo",
                        "app.mail.brevo.api-key=brevo-test-key",
                        "app.mail.brevo.base-url=https://api.brevo.test/v3",
                        "app.mail.from=BarberFlow <booking@example.com>"
                )
                .run(context -> assertThat(context)
                        .hasSingleBean(BrevoNotificationSender.class));
    }

    @Test
    void shouldRejectActivationWithoutApiKey() {
        assertThatThrownBy(() -> new BrevoNotificationSender(
                " ",
                "https://api.brevo.test/v3",
                "BarberFlow <booking@example.com>",
                Clock.fixed(NOW, ZoneOffset.UTC)
        ))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("BREVO_API_KEY");
    }

    @Test
    void shouldScheduleFutureEmailWithSenderAndIdempotencyKey() {
        RestClient.Builder builder = RestClient.builder()
                .baseUrl("https://api.brevo.test/v3")
                .defaultHeader("api-key", "test-key");
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        BrevoNotificationSender sender = new BrevoNotificationSender(
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

        server.expect(once(), requestTo("https://api.brevo.test/v3/smtp/email"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(header("api-key", "test-key"))
                .andExpect(jsonPath("$.sender.name").value("BarberFlow"))
                .andExpect(jsonPath("$.sender.email").value("booking@example.com"))
                .andExpect(jsonPath("$.to[0].email").value("client@example.com"))
                .andExpect(jsonPath("$.textContent").value("Your appointment is tomorrow."))
                .andExpect(jsonPath("$.scheduledAt").value("2026-09-15T10:00:00Z"))
                .andExpect(jsonPath("$.headers.idempotencyKey").value(notificationId.toString()))
                .andRespond(withSuccess(
                        "{\"messageId\":\"<message-123@relay.brevo.test>\"}",
                        MediaType.APPLICATION_JSON
                ));

        NotificationSendResult result = sender.send(notification);

        assertThat(result).isEqualTo(
                NotificationSendResult.scheduled("<message-123@relay.brevo.test>")
        );
        assertThat(sender.schedulingHorizon()).isEqualTo(Duration.ofHours(71));
        server.verify();
    }

    @Test
    void shouldSendImmediateEmailWithoutSchedulingField() {
        RestClient.Builder builder = RestClient.builder().baseUrl("https://api.brevo.test/v3");
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        BrevoNotificationSender sender = new BrevoNotificationSender(
                builder.build(),
                Clock.fixed(NOW, ZoneOffset.UTC),
                "booking@example.com"
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

        server.expect(once(), requestTo("https://api.brevo.test/v3/smtp/email"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(jsonPath("$.sender.name").value("BarberFlow"))
                .andExpect(jsonPath("$.scheduledAt").doesNotExist())
                .andRespond(withSuccess(
                        "{\"messageId\":\"<message-124@relay.brevo.test>\"}",
                        MediaType.APPLICATION_JSON
                ));

        NotificationSendResult result = sender.send(notification);

        assertThat(result).isEqualTo(
                NotificationSendResult.sent("<message-124@relay.brevo.test>")
        );
        server.verify();
    }

    @Test
    void shouldCancelScheduledEmailByProviderId() {
        RestClient.Builder builder = RestClient.builder().baseUrl("https://api.brevo.test/v3");
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        BrevoNotificationSender sender = new BrevoNotificationSender(
                builder.build(),
                Clock.fixed(NOW, ZoneOffset.UTC),
                "BarberFlow <booking@example.com>"
        );
        server.expect(once(), requestTo(
                        "https://api.brevo.test/v3/smtp/email/%3Cmessage-123%40relay.brevo.test%3E"
                ))
                .andExpect(method(HttpMethod.DELETE))
                .andRespond(withSuccess());

        sender.cancel("<message-123@relay.brevo.test>");

        server.verify();
    }
}
