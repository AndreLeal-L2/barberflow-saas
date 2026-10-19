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
import com.barberflow.notification.NotificationOutboxRepository;
import com.jayway.jsonpath.JsonPath;
import jakarta.servlet.http.Cookie;
import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.regex.Pattern;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

@Import(TestcontainersConfiguration.class)
@SpringBootTest(properties = "app.security.require-email-verification=true")
@AutoConfigureMockMvc
class BookingSecurityIntegrationTests {

    private static final AtomicInteger CLIENT_SEQUENCE = new AtomicInteger();
    private static final Pattern LINK_TOKEN = Pattern.compile("token=([A-Za-z0-9_-]+)");
    private static final String PASSWORD = "TesteSeguro2026!";

    @Autowired private MockMvc mockMvc;
    @Autowired private Clock clock;
    @Autowired private NotificationOutboxRepository notifications;
    @Autowired private JdbcTemplate jdbc;

    @Test
    void rejectsMissingAndMismatchedCsrfOnRegistrationAndAuthenticatedWrites() throws Exception {
        String request = registrationBody("csrf-" + UUID.randomUUID() + "@example.test");
        mockMvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).content(request))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("ACCESS_DENIED"));
        Cookie csrf = csrfCookie();
        mockMvc.perform(post("/api/auth/register").cookie(csrf)
                        .header("X-XSRF-TOKEN", "mismatched-token")
                        .contentType(MediaType.APPLICATION_JSON).content(request))
                .andExpect(status().isForbidden());

        Owner owner = register();
        mockMvc.perform(patch("/api/dashboard/barbershop/publication")
                        .cookie(owner.session()).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"published\":true}"))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/dashboard/barbershop").cookie(owner.session()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.published").value(false));
    }

    @Test
    void rejectsDuplicateEmailWithoutReplacingTheOriginalCredentials() throws Exception {
        Owner owner = register();
        mockMvc.perform(write(owner, post("/api/auth/register"))
                        .content(registrationBody(owner.email().toUpperCase())))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("EMAIL_ALREADY_REGISTERED"));
        mockMvc.perform(write(owner, post("/api/auth/login"))
                        .content("{\"email\":\"%s\",\"password\":\"%s\"}".formatted(owner.email(), PASSWORD)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.email").value(owner.email()));
        mockMvc.perform(write(owner, post("/api/auth/login"))
                        .content("{\"email\":\"%s\",\"password\":\"IncorrectPassword!\"}".formatted(owner.email())))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("INVALID_CREDENTIALS"));
    }

    @Test
    void requiresServicesHoursAndVerifiedEmailButNotOptionalProfileFields() throws Exception {
        Owner owner = register();
        publication(owner, true).andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("BARBERSHOP_NOT_READY"));
        createService(owner);
        publication(owner, true).andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("BARBERSHOP_NOT_READY"));
        setSchedule(owner, "09:00", "12:00");
        publication(owner, true).andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("EMAIL_VERIFICATION_REQUIRED"));
        mockMvc.perform(get(publicPath(owner))).andExpect(status().isNotFound());

        verifyEmail(owner);
        publication(owner, true).andExpect(status().isOk())
                .andExpect(jsonPath("$.published").value(true))
                .andExpect(jsonPath("$.completedSetupSteps").value(4));
        mockMvc.perform(get(publicPath(owner))).andExpect(status().isOk());
        publication(owner, false).andExpect(status().isOk())
                .andExpect(jsonPath("$.published").value(false));
        mockMvc.perform(get(publicPath(owner))).andExpect(status().isNotFound());
    }

    @Test
    void refusesPublicationAndPublicAccessForInactiveSubscriptionsButAllowsPausing() throws Exception {
        Fixture fixture = publishedFixture();
        jdbc.update("update barbershops set subscription_status = 'CANCELLED' where slug = ?", fixture.owner().slug());
        publication(fixture.owner(), true).andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("SUBSCRIPTION_INACTIVE"));
        mockMvc.perform(get(publicPath(fixture.owner()))).andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("SUBSCRIPTION_INACTIVE"));
        publication(fixture.owner(), false).andExpect(status().isOk())
                .andExpect(jsonPath("$.published").value(false));
    }

    @Test
    void preventsAnotherTenantFromReadingOrMutatingServicesBookingsAndBlocks() throws Exception {
        Fixture fixture = publishedFixture();
        Owner stranger = register();
        String bookingId = jsonId(book(fixture, bookingDate().atTime(9, 0))
                .andExpect(status().isCreated()).andReturn());
        String blockId = jsonId(mockMvc.perform(write(fixture.owner(), post("/api/dashboard/availability/blocks"))
                        .content("{\"startAt\":\"%s\",\"endAt\":\"%s\",\"reason\":\"Private\"}"
                                .formatted(bookingDate().atTime(11, 0), bookingDate().atTime(12, 0))))
                .andExpect(status().isCreated()).andReturn());

        mockMvc.perform(get("/api/dashboard/bookings").cookie(stranger.session()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(0));
        mockMvc.perform(get("/api/dashboard/services").cookie(stranger.session()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(0));
        mockMvc.perform(get("/api/dashboard/availability/blocks").cookie(stranger.session()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(0));
        mockMvc.perform(write(stranger, patch("/api/dashboard/bookings/{id}/status", bookingId))
                        .content("{\"status\":\"CANCELLED\"}"))
                .andExpect(status().isNotFound()).andExpect(jsonPath("$.code").value("BOOKING_NOT_FOUND"));
        mockMvc.perform(write(stranger, put("/api/dashboard/services/{id}", fixture.serviceId()))
                        .content(serviceBody()))
                .andExpect(status().isNotFound()).andExpect(jsonPath("$.code").value("SERVICE_NOT_FOUND"));
        mockMvc.perform(write(stranger, delete("/api/dashboard/services/{id}", fixture.serviceId())))
                .andExpect(status().isNotFound());
        mockMvc.perform(write(stranger, delete("/api/dashboard/availability/blocks/{id}", blockId)))
                .andExpect(status().isNotFound()).andExpect(jsonPath("$.code").value("BLOCKED_TIME_NOT_FOUND"));
        mockMvc.perform(get("/api/dashboard/bookings").cookie(fixture.owner().session()))
                .andExpect(status().isOk()).andExpect(jsonPath("$[0].status").value("CONFIRMED"));
        mockMvc.perform(get("/api/dashboard/services").cookie(fixture.owner().session()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(1));
        mockMvc.perform(get("/api/dashboard/availability/blocks").cookie(fixture.owner().session()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(1));
    }

    @Test
    void rejectsAServiceFromAnotherShopOnPublicSlotAndBookingEndpoints() throws Exception {
        Fixture fixture = publishedFixture();
        Owner other = register();
        String foreignService = createService(other);
        mockMvc.perform(get(publicPath(fixture.owner()) + "/available-slots")
                        .param("serviceId", foreignService).param("date", bookingDate().toString()))
                .andExpect(status().isNotFound()).andExpect(jsonPath("$.code").value("SERVICE_NOT_FOUND"));
        Fixture foreignSelection = new Fixture(fixture.owner(), foreignService);
        book(foreignSelection, bookingDate().atTime(9, 0))
                .andExpect(status().isNotFound()).andExpect(jsonPath("$.code").value("SERVICE_NOT_FOUND"));
    }

    @Test
    void permitsOnlyOneOfTwoConcurrentRequestsForTheSameSlot() throws Exception {
        Fixture fixture = publishedFixture();
        CountDownLatch start = new CountDownLatch(1);
        var executor = Executors.newFixedThreadPool(2);
        try {
            var first = executor.submit(() -> {
                assertThat(start.await(5, TimeUnit.SECONDS)).isTrue();
                return book(fixture, bookingDate().atTime(9, 0)).andReturn().getResponse().getStatus();
            });
            var second = executor.submit(() -> {
                assertThat(start.await(5, TimeUnit.SECONDS)).isTrue();
                return book(fixture, bookingDate().atTime(9, 0)).andReturn().getResponse().getStatus();
            });
            start.countDown();
            assertThat(List.of(first.get(20, TimeUnit.SECONDS), second.get(20, TimeUnit.SECONDS)))
                    .containsExactlyInAnyOrder(201, 409);
        } finally {
            executor.shutdownNow();
        }
        mockMvc.perform(get("/api/dashboard/bookings").cookie(fixture.owner().session()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(1));
    }

    @Test
    void preservesTheScheduleOnInvalidReplacementAndUnpublishesWhenAllHoursAreRemoved() throws Exception {
        Fixture fixture = publishedFixture();
        Owner owner = fixture.owner();
        String day = bookingDate().getDayOfWeek().name();
        mockMvc.perform(write(owner, put("/api/dashboard/availability"))
                        .content("{\"days\":[{\"dayOfWeek\":\"%s\",\"startTime\":\"10:00\",\"endTime\":\"11:00\"},"
                                .formatted(day) + "{\"dayOfWeek\":\"%s\",\"startTime\":\"11:00\",\"endTime\":\"12:00\"}]}".formatted(day)))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("DUPLICATE_AVAILABILITY_DAY"));
        mockMvc.perform(write(owner, put("/api/dashboard/availability"))
                        .content("{\"days\":[{\"dayOfWeek\":\"%s\",\"startTime\":\"12:00\",\"endTime\":\"09:00\"}]}".formatted(day)))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
        mockMvc.perform(get("/api/dashboard/availability").cookie(owner.session()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].startTime").value("09:00:00"))
                .andExpect(jsonPath("$[0].endTime").value("12:00:00"));
        mockMvc.perform(get("/api/dashboard/barbershop").cookie(owner.session()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.published").value(true));
        mockMvc.perform(write(owner, put("/api/dashboard/availability")).content("{\"days\":[]}"))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/dashboard/barbershop").cookie(owner.session()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.published").value(false))
                .andExpect(jsonPath("$.canPublish").value(false));
        mockMvc.perform(get(publicPath(owner))).andExpect(status().isNotFound());
    }

    @Test
    void unpublishesWhenTheLastActiveServiceIsDeleted() throws Exception {
        Fixture fixture = publishedFixture();
        mockMvc.perform(write(fixture.owner(), delete("/api/dashboard/services/{id}", fixture.serviceId())))
                .andExpect(status().isNoContent());
        mockMvc.perform(get("/api/dashboard/barbershop").cookie(fixture.owner().session()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.serviceCount").value(0))
                .andExpect(jsonPath("$.published").value(false)).andExpect(jsonPath("$.canPublish").value(false));
        mockMvc.perform(get(publicPath(fixture.owner()))).andExpect(status().isNotFound());
    }

    @Test
    void rejectsBookingWithSecondsThatWasNeverOfferedAsAnAvailableSlot() throws Exception {
        Fixture fixture = publishedFixture();
        LocalDateTime unadvertised = bookingDate().atTime(9, 0, 1);
        MvcResult slots = mockMvc.perform(get(publicPath(fixture.owner()) + "/available-slots")
                        .param("serviceId", fixture.serviceId()).param("date", bookingDate().toString()))
                .andExpect(status().isOk()).andReturn();
        List<String> advertisedStarts = JsonPath.read(slots.getResponse().getContentAsString(), "$[*].startAt");
        assertThat(advertisedStarts).contains(bookingDate() + "T09:00:00")
                .doesNotContain(unadvertised.toString());
        book(fixture, unadvertised).andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("BOOKING_SLOT_UNAVAILABLE"));
        mockMvc.perform(get("/api/dashboard/bookings").cookie(fixture.owner().session()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void rejectsFractionalSecondOffsetsWithoutCreatingABooking() throws Exception {
        Fixture fixture = publishedFixture();
        book(fixture, bookingDate().atTime(9, 0, 0, 1))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("BOOKING_SLOT_UNAVAILABLE"));
        mockMvc.perform(get("/api/dashboard/bookings").cookie(fixture.owner().session()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void acceptsTheExactAdvertisedSlotRelativeToTheConfiguredOpeningTime() throws Exception {
        Fixture fixture = publishedFixture();
        setSchedule(fixture.owner(), "09:00:30", "12:00:30");
        mockMvc.perform(get(publicPath(fixture.owner()) + "/available-slots")
                        .param("serviceId", fixture.serviceId()).param("date", bookingDate().toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].startAt").value(bookingDate() + "T09:00:30"));
        book(fixture, bookingDate().atTime(9, 0, 30)).andExpect(status().isCreated());
    }

    private Owner register() throws Exception {
        int client = CLIENT_SEQUENCE.incrementAndGet();
        String email = "regression-" + UUID.randomUUID() + "@example.test";
        Cookie csrf = csrfCookie();
        MvcResult result = mockMvc.perform(post("/api/auth/register")
                        .with(request -> { request.setRemoteAddr("198.51.100." + client); return request; })
                        .cookie(csrf).header("X-XSRF-TOKEN", csrf.getValue())
                        .contentType(MediaType.APPLICATION_JSON).content(registrationBody(email)))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.emailVerificationRequired").value(true))
                .andReturn();
        Cookie session = result.getResponse().getCookie("BARBERFLOW_SESSION");
        assertThat(session).isNotNull();
        return new Owner(session, csrf, JsonPath.read(result.getResponse().getContentAsString(), "$.barbershop.slug"), email);
    }

    private Fixture publishedFixture() throws Exception {
        Owner owner = register();
        String serviceId = createService(owner);
        setSchedule(owner, "09:00", "12:00");
        verifyEmail(owner);
        publication(owner, true).andExpect(status().isOk());
        return new Fixture(owner, serviceId);
    }

    private String createService(Owner owner) throws Exception {
        return jsonId(mockMvc.perform(write(owner, post("/api/dashboard/services")).content(serviceBody()))
                .andExpect(status().isCreated()).andReturn());
    }

    private void setSchedule(Owner owner, String start, String end) throws Exception {
        mockMvc.perform(write(owner, put("/api/dashboard/availability"))
                        .content("{\"days\":[{\"dayOfWeek\":\"%s\",\"startTime\":\"%s\",\"endTime\":\"%s\"}]}"
                                .formatted(bookingDate().getDayOfWeek(), start, end)))
                .andExpect(status().isOk());
    }

    private void verifyEmail(Owner owner) throws Exception {
        var notification = notifications.findFirstByNotificationTypeAndRecipientOrderByCreatedAtDesc("VERIFY_EMAIL", owner.email()).orElseThrow();
        var matcher = LINK_TOKEN.matcher(notification.getBody());
        assertThat(matcher.find()).isTrue();
        mockMvc.perform(write(owner, post("/api/auth/verification/confirm"))
                        .content("{\"token\":\"%s\"}".formatted(matcher.group(1))))
                .andExpect(status().isOk());
    }

    private org.springframework.test.web.servlet.ResultActions publication(Owner owner, boolean published) throws Exception {
        return mockMvc.perform(write(owner, patch("/api/dashboard/barbershop/publication"))
                .content("{\"published\":%s}".formatted(published)));
    }

    private org.springframework.test.web.servlet.ResultActions book(Fixture fixture, LocalDateTime start) throws Exception {
        return mockMvc.perform(write(fixture.owner(), post(publicPath(fixture.owner()) + "/bookings"))
                .content("{\"serviceId\":\"%s\",\"startAt\":\"%s\",\"customerName\":\"Cliente Regressão\",\"customerPhone\":\"%s\",\"customerEmail\":\"cliente@example.test\"}"
                        .formatted(fixture.serviceId(), start, "+3519%08d".formatted(Math.abs(fixture.owner().email().hashCode() % 100_000_000)))));
    }

    private MockHttpServletRequestBuilder write(Owner owner, MockHttpServletRequestBuilder request) {
        return request.cookie(owner.session(), owner.csrf())
                .header("X-XSRF-TOKEN", owner.csrf().getValue()).contentType(MediaType.APPLICATION_JSON)
                .with(servletRequest -> { servletRequest.setRemoteAddr("203.0.113." + Math.abs(owner.email().hashCode() % 250)); return servletRequest; });
    }

    private Cookie csrfCookie() throws Exception {
        Cookie cookie = mockMvc.perform(get("/api/auth/csrf")).andExpect(status().isOk())
                .andReturn().getResponse().getCookie("XSRF-TOKEN");
        assertThat(cookie).isNotNull();
        return cookie;
    }

    private LocalDate bookingDate() { return LocalDate.now(clock).plusDays(2); }
    private static String publicPath(Owner owner) { return "/api/public/barbershops/" + owner.slug(); }
    private static String jsonId(MvcResult result) throws Exception { return JsonPath.read(result.getResponse().getContentAsString(), "$.id"); }
    private static String registrationBody(String email) {
        return "{\"ownerName\":\"Teste Segurança\",\"barbershopName\":\"Regressão %s\",\"email\":\"%s\",\"phone\":\"+351 910 000 001\",\"password\":\"%s\"}"
                .formatted(UUID.randomUUID(), email, PASSWORD);
    }
    private static String serviceBody() {
        return "{\"name\":\"Corte de teste\",\"description\":\"\",\"durationMinutes\":30,\"priceAmount\":18}";
    }
    private record Owner(Cookie session, Cookie csrf, String slug, String email) {}
    private record Fixture(Owner owner, String serviceId) {}
}
