package com.barberflow.booking;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.barberflow.TestcontainersConfiguration;
import com.jayway.jsonpath.JsonPath;
import jakarta.servlet.http.Cookie;
import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;

@Import(TestcontainersConfiguration.class)
@SpringBootTest
@AutoConfigureMockMvc
class BookingReadPerformanceIntegrationTests {
    @Autowired MockMvc mvc;
    @Autowired JdbcTemplate jdbc;
    @Autowired Clock clock;
    Cookie session;
    UUID shop;
    LocalDate day;

    @BeforeEach
    void registerAndSeed() throws Exception {
        String suffix = UUID.randomUUID().toString();
        Cookie csrf = mvc.perform(get("/api/auth/csrf")).andReturn().getResponse().getCookie("XSRF-TOKEN");
        var result = mvc.perform(post("/api/auth/register").with(request -> {
                    request.setRemoteAddr("performance-" + suffix);
                    return request;
                }).cookie(csrf)
                .header("X-XSRF-TOKEN", csrf.getValue()).contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"ownerName":"Performance Test","barbershopName":"Performance %s",
                    "email":"%s@example.test","phone":"+351 910 000 001","password":"TesteSeguro2026!"}
                    """.formatted(suffix, suffix))).andExpect(status().isCreated()).andReturn();
        session = result.getResponse().getCookie("BARBERFLOW_SESSION");
        shop = UUID.fromString(JsonPath.read(result.getResponse().getContentAsString(), "$.barbershop.id"));
        mvc.perform(post("/api/dashboard/services").cookie(session, csrf)
                .header("X-XSRF-TOKEN", csrf.getValue()).contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"name":"Sessão","description":"","durationMinutes":30,"priceAmount":20}
                    """)).andExpect(status().isCreated());
        day = LocalDate.now(clock).plusDays(2);
        insert("old", day.minusDays(10).atTime(10, 0), day.minusDays(10).atTime(10, 30), "COMPLETED");
        insert("overlap", day.minusDays(1).atTime(23, 45), day.atTime(0, 15), "CONFIRMED");
        insert("first", day.atTime(10, 0), day.atTime(10, 30), "CONFIRMED");
        insert("second", day.atTime(11, 0), day.atTime(11, 30), "CONFIRMED");
        insert("cancelled", day.atTime(12, 0), day.atTime(12, 30), "CANCELLED");
        insert("tomorrow", day.plusDays(1).atTime(10, 0), day.plusDays(1).atTime(10, 30), "CONFIRMED");
    }

    @Test
    void returnsOnlyBookingsOverlappingTheRequestedDay() throws Exception {
        mvc.perform(get("/api/dashboard/bookings").cookie(session)
                .param("from", day.toString()).param("to", day.plusDays(1).toString()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(4))
                .andExpect(jsonPath("$[0].customerName").value("overlap"));
    }

    @Test
    void boundsUpcomingReadsAndKeepsPagesDisjoint() throws Exception {
        var first = mvc.perform(get("/api/dashboard/bookings").cookie(session)
                .param("view", "upcoming").param("page", "0").param("size", "2"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(3)).andReturn();
        var second = mvc.perform(get("/api/dashboard/bookings").cookie(session)
                .param("view", "upcoming").param("page", "1").param("size", "2"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(2)).andReturn();
        List<String> firstNames = JsonPath.read(first.getResponse().getContentAsString(), "$[*].customerName");
        List<String> secondNames = JsonPath.read(second.getResponse().getContentAsString(), "$[*].customerName");
        assertThat(firstNames.subList(0, 2)).doesNotContainAnyElementsOf(secondNames);
        assertThat(firstNames).doesNotContain("old", "cancelled");
    }

    @Test
    void readsOnlyHistoryAndLimitsTheOverview() throws Exception {
        mvc.perform(get("/api/dashboard/bookings").cookie(session).param("view", "history").param("size", "1"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].customerName").value("cancelled"));
        mvc.perform(get("/api/dashboard/bookings").cookie(session).param("view", "next").param("size", "1"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].customerName").value("overlap"));
    }

    @Test
    void rejectsUnboundedOrInvalidRangesAndPageSizes() throws Exception {
        mvc.perform(get("/api/dashboard/bookings").cookie(session).param("from", day.toString()))
                .andExpect(status().isBadRequest());
        mvc.perform(get("/api/dashboard/bookings").cookie(session).param("view", "upcoming").param("size", "10001"))
                .andExpect(status().isBadRequest());
        mvc.perform(get("/api/dashboard/bookings").cookie(session).param("from", day.toString())
                .param("to", day.plusDays(367).toString())).andExpect(status().isBadRequest());
    }

    private void insert(String name, LocalDateTime start, LocalDateTime end, String status) {
        jdbc.update("""
            insert into bookings (id, barbershop_id, barber_id, service_id, customer_name, customer_phone,
              start_at, end_at, service_name_snapshot, service_duration_snapshot, service_price_snapshot,
              price_currency, status, created_at, updated_at, version)
            select ?, s.barbershop_id, b.id, s.id, ?, '+351 930 000 001', ?, ?, s.name, 30, 20,
              'EUR', ?, now(), now(), 0 from barbershop_services s join barbers b on b.barbershop_id=s.barbershop_id
            where s.barbershop_id=?
            """, UUID.randomUUID(), name, start, end, status, shop);
    }
}
