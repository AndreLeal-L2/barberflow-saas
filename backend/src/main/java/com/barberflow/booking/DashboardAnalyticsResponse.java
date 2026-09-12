package com.barberflow.booking;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public record DashboardAnalyticsResponse(
        LocalDate asOfDate,
        LocalDate upcomingPeriodEnd,
        long bookingsToday,
        long upcomingBookings,
        long completedLast30Days,
        long cancelledLast30Days,
        BigDecimal scheduledValue,
        String priceCurrency,
        TopServiceMetric topUpcomingService,
        List<DailyBookingMetric> upcomingDailyBookings
) {
    public record TopServiceMetric(String name, long bookingCount) {
    }

    public record DailyBookingMetric(LocalDate date, long bookingCount) {
    }
}
