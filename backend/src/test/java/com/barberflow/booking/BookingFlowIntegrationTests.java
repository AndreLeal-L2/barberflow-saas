package com.barberflow.booking;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.barberflow.TestcontainersConfiguration;
import com.jayway.jsonpath.JsonPath;
import jakarta.servlet.http.Cookie;
import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

@Import(TestcontainersConfiguration.class)
@SpringBootTest
@AutoConfigureMockMvc
class BookingFlowIntegrationTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private Clock clock;

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
        MockHttpSession session = (MockHttpSession) registration.getRequest().getSession(false);
        assertThat(session).isNotNull();

        MvcResult serviceResult = mockMvc.perform(post("/api/dashboard/services")
                        .session(session)
                        .cookie(csrfCookie)
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
                        .session(session)
                        .cookie(csrfCookie)
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
                        .session(session)
                        .cookie(csrfCookie)
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

        mockMvc.perform(post("/api/public/barbershops/barbearia-fluxo-completo/bookings")
                        .cookie(csrfCookie)
                        .header("X-XSRF-TOKEN", csrfCookie.getValue())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(bookingRequest))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("BOOKING_SLOT_UNAVAILABLE"));

        mockMvc.perform(get("/api/dashboard/bookings").session(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].customerName").value("Cliente Teste"));

        mockMvc.perform(patch("/api/dashboard/bookings/{id}/status", bookingId)
                        .session(session)
                        .cookie(csrfCookie)
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
}
