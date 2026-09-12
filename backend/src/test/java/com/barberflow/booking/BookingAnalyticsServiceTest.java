package com.barberflow.booking;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class BookingAnalyticsServiceTest {

    private static final ZoneId TIME_ZONE = ZoneId.of("Europe/Lisbon");
    private static final Clock CLOCK = Clock.fixed(
            Instant.parse("2026-09-12T10:00:00Z"),
            TIME_ZONE
    );

    @Mock
    private BookingRepository bookingRepository;

    @Test
    void calculatesOperationalMetricsAndExcludesCancelledScheduledValue() {
        UUID barbershopId = UUID.randomUUID();
        LocalDate today = LocalDate.now(CLOCK);
        when(bookingRepository.findAnalyticsEntries(
                barbershopId,
                today.minusDays(29).atStartOfDay(),
                today.plusDays(30).atStartOfDay()
        )).thenReturn(List.of(
                entry(today.atTime(9, 0), "Corte", "18.00", BookingStatus.CONFIRMED),
                entry(today.plusDays(1).atTime(10, 0), "Corte", "18.00", BookingStatus.CONFIRMED),
                entry(today.plusDays(1).atTime(11, 0), "Barba", "12.00", BookingStatus.CANCELLED),
                entry(today.minusDays(1).atTime(12, 0), "Corte", "18.00", BookingStatus.COMPLETED),
                entry(today.minusDays(2).atTime(12, 0), "Barba", "12.00", BookingStatus.CANCELLED)
        ));

        DashboardAnalyticsResponse response = new BookingAnalyticsService(
                bookingRepository,
                CLOCK
        ).get(barbershopId);

        assertThat(response.asOfDate()).isEqualTo(today);
        assertThat(response.upcomingPeriodEnd()).isEqualTo(today.plusDays(29));
        assertThat(response.bookingsToday()).isEqualTo(1);
        assertThat(response.upcomingBookings()).isEqualTo(2);
        assertThat(response.completedLast30Days()).isEqualTo(1);
        assertThat(response.cancelledLast30Days()).isEqualTo(1);
        assertThat(response.scheduledValue()).isEqualByComparingTo("36.00");
        assertThat(response.priceCurrency()).isEqualTo("EUR");
        assertThat(response.topUpcomingService())
                .isEqualTo(new DashboardAnalyticsResponse.TopServiceMetric("Corte", 2));
        assertThat(response.upcomingDailyBookings()).hasSize(14);
        assertThat(response.upcomingDailyBookings().getFirst().bookingCount()).isEqualTo(1);
        assertThat(response.upcomingDailyBookings().get(1).bookingCount()).isEqualTo(1);

        verify(bookingRepository).findAnalyticsEntries(
                barbershopId,
                today.minusDays(29).atStartOfDay(),
                today.plusDays(30).atStartOfDay()
        );
    }

    @Test
    void returnsStableEmptyMetrics() {
        UUID barbershopId = UUID.randomUUID();
        LocalDate today = LocalDate.now(CLOCK);
        when(bookingRepository.findAnalyticsEntries(
                barbershopId,
                today.minusDays(29).atStartOfDay(),
                today.plusDays(30).atStartOfDay()
        )).thenReturn(List.of());

        DashboardAnalyticsResponse response = new BookingAnalyticsService(
                bookingRepository,
                CLOCK
        ).get(barbershopId);

        assertThat(response.bookingsToday()).isZero();
        assertThat(response.upcomingBookings()).isZero();
        assertThat(response.completedLast30Days()).isZero();
        assertThat(response.cancelledLast30Days()).isZero();
        assertThat(response.scheduledValue()).isEqualByComparingTo("0.00");
        assertThat(response.topUpcomingService()).isNull();
        assertThat(response.upcomingDailyBookings())
                .hasSize(14)
                .allMatch(day -> day.bookingCount() == 0);
    }

    private BookingAnalyticsEntry entry(
            LocalDateTime startAt,
            String serviceName,
            String price,
            BookingStatus status
    ) {
        return new BookingAnalyticsEntry(
                startAt,
                serviceName,
                new BigDecimal(price),
                "EUR",
                status
        );
    }
}
