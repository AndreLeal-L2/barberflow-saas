package com.barberflow.booking;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.barberflow.TestcontainersConfiguration;
import com.barberflow.notification.NotificationOutbox;
import com.barberflow.notification.NotificationOutboxRepository;
import com.barberflow.notification.NotificationStatus;
import com.jayway.jsonpath.JsonPath;
import jakarta.servlet.http.Cookie;
import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

@Import(TestcontainersConfiguration.class)
@SpringBootTest
@AutoConfigureMockMvc
class BookingFlowIntegrationTests {

    private static final Pattern LINK_TOKEN = Pattern.compile("token=([A-Za-z0-9_-]+)");

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private Clock clock;

    @Autowired
    private NotificationOutboxRepository notificationRepository;

    @Test
    void shouldConfigurePublishBookAndCancel() throws Exception {
        MvcResult csrfResult = mockMvc.perform(get("/api/auth/csrf"))
                .andExpect(status().isOk())
                .andReturn();
        Cookie csrfCookie = csrfResult.getResponse().getCookie("XSRF-TOKEN");
        assertThat(csrfCookie).isNotNull();

        MvcResult registration = mockMvc.perform(post("/api/auth/register")
                        .cookie(csrfCookie)
                        .header("X-XSRF-TOKEN", csrfCookie.getValue())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "ownerName": "Duarte Martins",
                                  "barbershopName": "Barbearia Fluxo Completo",
                                  "email": "booking-flow@example.test",
                                  "phone": "+351 910 000 002",
                                  "password": "TesteSeguro2026!"
                                }
                                """))
                .andExpect(status().isCreated())
                .andReturn();
        Cookie sessionCookie = registration.getResponse().getCookie("BARBERFLOW_SESSION");
        assertThat(sessionCookie).isNotNull();

        MvcResult serviceResult = mockMvc.perform(post("/api/dashboard/services")
                        .cookie(sessionCookie, csrfCookie)
                        .header("X-XSRF-TOKEN", csrfCookie.getValue())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "name": "Corte clássico",
                                  "description": "Corte e acabamento",
                                  "durationMinutes": 45,
                                  "priceAmount": 18.00
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.priceCurrency").value("EUR"))
                .andReturn();
        String serviceId = JsonPath.read(serviceResult.getResponse().getContentAsString(), "$.id");

        LocalDate bookingDate = LocalDate.now(clock).plusDays(1);
        mockMvc.perform(put("/api/dashboard/availability")
                        .cookie(sessionCookie, csrfCookie)
                        .header("X-XSRF-TOKEN", csrfCookie.getValue())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "days": [{
                                    "dayOfWeek": "%s",
                                    "startTime": "09:00",
                                    "endTime": "17:00"
                                  }]
                                }
                                """.formatted(bookingDate.getDayOfWeek())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].dayOfWeek").value(bookingDate.getDayOfWeek().name()));

        mockMvc.perform(patch("/api/dashboard/barbershop/publication")
                        .cookie(sessionCookie, csrfCookie)
                        .header("X-XSRF-TOKEN", csrfCookie.getValue())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"published": true}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.published").value(true))
                .andExpect(jsonPath("$.completedSetupSteps").value(4));

        mockMvc.perform(get(
                        "/api/public/barbershops/barbearia-fluxo-completo/available-slots")
                        .param("serviceId", serviceId)
                        .param("date", bookingDate.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].startAt").exists());

        LocalDateTime blockedStart = bookingDate.atTime(10, 0);
        LocalDateTime blockedEnd = bookingDate.atTime(12, 0);
        MvcResult blockedTimeResult = mockMvc.perform(post(
                                "/api/dashboard/availability/blocks")
                        .cookie(sessionCookie, csrfCookie)
                        .header("X-XSRF-TOKEN", csrfCookie.getValue())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "startAt": "%s",
                                  "endAt": "%s",
                                  "reason": "Compromisso"
                                }
                                """.formatted(blockedStart, blockedEnd)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.reason").value("Compromisso"))
                .andReturn();
        String blockedTimeId = JsonPath.read(
                blockedTimeResult.getResponse().getContentAsString(),
                "$.id"
        );

        MvcResult slotsWithBlock = mockMvc.perform(get(
                        "/api/public/barbershops/barbearia-fluxo-completo/available-slots")
                        .param("serviceId", serviceId)
                        .param("date", bookingDate.toString()))
                .andExpect(status().isOk())
                .andReturn();
        List<String> blockedStarts = JsonPath.read(
                slotsWithBlock.getResponse().getContentAsString(),
                "$[*].startAt"
        );
        assertThat(blockedStarts)
                .contains(bookingDate.atTime(9, 0) + ":00")
                .doesNotContain(blockedStart + ":00");

        String blockedBookingRequest = """
                {
                  "serviceId": "%s",
                  "startAt": "%s",
                  "customerName": "Cliente Bloqueado",
                  "customerPhone": "+351 930 000 002",
                  "customerEmail": "bloqueado@example.test"
                }
                """.formatted(serviceId, blockedStart);
        mockMvc.perform(post("/api/public/barbershops/barbearia-fluxo-completo/bookings")
                        .cookie(csrfCookie)
                        .header("X-XSRF-TOKEN", csrfCookie.getValue())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(blockedBookingRequest))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("BOOKING_SLOT_UNAVAILABLE"));

        mockMvc.perform(delete("/api/dashboard/availability/blocks/{id}", blockedTimeId)
                        .cookie(sessionCookie, csrfCookie)
                        .header("X-XSRF-TOKEN", csrfCookie.getValue()))
                .andExpect(status().isNoContent());

        MvcResult slotsAfterDelete = mockMvc.perform(get(
                        "/api/public/barbershops/barbearia-fluxo-completo/available-slots")
                        .param("serviceId", serviceId)
                        .param("date", bookingDate.toString()))
                .andExpect(status().isOk())
                .andReturn();
        List<String> restoredStarts = JsonPath.read(
                slotsAfterDelete.getResponse().getContentAsString(),
                "$[*].startAt"
        );
        assertThat(restoredStarts).contains(blockedStart + ":00");

        LocalDateTime startAt = bookingDate.atTime(9, 0);
        String bookingRequest = """
                {
                  "serviceId": "%s",
                  "startAt": "%s",
                  "customerName": "Cliente Teste",
                  "customerPhone": "+351 930 000 001",
                  "customerEmail": "cliente@example.test"
                }
                """.formatted(serviceId, startAt);

        MvcResult bookingResult = mockMvc.perform(post(
                                "/api/public/barbershops/barbearia-fluxo-completo/bookings")
                        .cookie(csrfCookie)
                        .header("X-XSRF-TOKEN", csrfCookie.getValue())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(bookingRequest))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("CONFIRMED"))
                .andReturn();
        String bookingId = JsonPath.read(bookingResult.getResponse().getContentAsString(), "$.id");
        NotificationOutbox reminder = notificationRepository
                .findFirstByNotificationTypeAndRecipientOrderByCreatedAtDesc(
                        "BOOKING_REMINDER_3H",
                        "cliente@example.test"
                )
                .orElseThrow();
        assertThat(reminder.getStatus()).isEqualTo(NotificationStatus.PENDING);

        mockMvc.perform(post("/api/dashboard/availability/blocks")
                        .cookie(sessionCookie, csrfCookie)
                        .header("X-XSRF-TOKEN", csrfCookie.getValue())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "startAt": "%s",
                                  "endAt": "%s",
                                  "reason": "Tentativa inválida"
                                }
                                """.formatted(startAt, startAt.plusHours(1))))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("BLOCKED_TIME_HAS_BOOKING"));

        mockMvc.perform(post("/api/public/barbershops/barbearia-fluxo-completo/bookings")
                        .cookie(csrfCookie)
                        .header("X-XSRF-TOKEN", csrfCookie.getValue())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(bookingRequest))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("BOOKING_SLOT_UNAVAILABLE"));

        mockMvc.perform(get("/api/dashboard/bookings").cookie(sessionCookie))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].customerName").value("Cliente Teste"));

        String cancellationToken = cancellationTokenFor("cliente@example.test");
        mockMvc.perform(post("/api/public/bookings/cancel")
                        .cookie(csrfCookie)
                        .header("X-XSRF-TOKEN", csrfCookie.getValue())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"token\":\"%s\"}".formatted(cancellationToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("A marcação foi cancelada."));
        assertThat(notificationRepository.findById(reminder.getId()).orElseThrow().getStatus())
                .isEqualTo(NotificationStatus.CANCELLED);

        mockMvc.perform(post("/api/public/bookings/cancel")
                        .cookie(csrfCookie)
                        .header("X-XSRF-TOKEN", csrfCookie.getValue())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"token\":\"%s\"}".formatted(cancellationToken)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code")
                        .value("BOOKING_CANCELLATION_TOKEN_INVALID"));

        MvcResult secondBookingResult = mockMvc.perform(post(
                                "/api/public/barbershops/barbearia-fluxo-completo/bookings")
                        .cookie(csrfCookie)
                        .header("X-XSRF-TOKEN", csrfCookie.getValue())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(bookingRequest))
                .andExpect(status().isCreated())
                .andReturn();
        bookingId = JsonPath.read(secondBookingResult.getResponse().getContentAsString(), "$.id");

        mockMvc.perform(get("/api/dashboard/analytics").cookie(sessionCookie))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.bookingsToday").value(0))
                .andExpect(jsonPath("$.upcomingBookings").value(1))
                .andExpect(jsonPath("$.scheduledValue").value(18.0))
                .andExpect(jsonPath("$.priceCurrency").value("EUR"))
                .andExpect(jsonPath("$.topUpcomingService.name").value("Corte clássico"))
                .andExpect(jsonPath("$.topUpcomingService.bookingCount").value(1))
                .andExpect(jsonPath("$.upcomingDailyBookings[1].bookingCount").value(1));

        mockMvc.perform(patch("/api/dashboard/bookings/{id}/status", bookingId)
                        .cookie(sessionCookie, csrfCookie)
                        .header("X-XSRF-TOKEN", csrfCookie.getValue())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"status": "CANCELLED"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CANCELLED"));

        mockMvc.perform(get(
                        "/api/public/barbershops/barbearia-fluxo-completo/available-slots")
                        .param("serviceId", serviceId)
                        .param("date", bookingDate.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].startAt").value(startAt + ":00"));
    }

    private String cancellationTokenFor(String recipient) {
        NotificationOutbox notification = notificationRepository
                .findFirstByNotificationTypeAndRecipientOrderByCreatedAtDesc(
                        "BOOKING_CONFIRMATION_CUSTOMER",
                        recipient
                )
                .orElseThrow();
        Matcher matcher = LINK_TOKEN.matcher(notification.getBody());
        assertThat(matcher.find()).isTrue();
        return matcher.group(1);
    }
}
