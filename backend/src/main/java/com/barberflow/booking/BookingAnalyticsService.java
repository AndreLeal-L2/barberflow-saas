package com.barberflow.booking;

import com.barberflow.booking.DashboardAnalyticsResponse.DailyBookingMetric;
import com.barberflow.booking.DashboardAnalyticsResponse.TopServiceMetric;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Clock;
import java.time.LocalDate;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.IntStream;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class BookingAnalyticsService {

    private static final int HISTORY_DAYS = 30;
    private static final int UPCOMING_DAYS = 30;
    private static final int DAILY_ACTIVITY_DAYS = 14;

    private final BookingRepository bookingRepository;
    private final Clock clock;

    public BookingAnalyticsService(BookingRepository bookingRepository, Clock clock) {
        this.bookingRepository = bookingRepository;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public DashboardAnalyticsResponse get(UUID barbershopId) {
        LocalDate today = LocalDate.now(clock);
        LocalDate historyStart = today.minusDays(HISTORY_DAYS - 1L);
        LocalDate upcomingEndExclusive = today.plusDays(UPCOMING_DAYS);
        LocalDate dailyActivityEndExclusive = today.plusDays(DAILY_ACTIVITY_DAYS);

        List<BookingAnalyticsEntry> entries = bookingRepository.findAnalyticsEntries(
                barbershopId,
                historyStart.atStartOfDay(),
                upcomingEndExclusive.atStartOfDay()
        );

        Map<LocalDate, Long> upcomingDailyCounts = new LinkedHashMap<>();
        IntStream.range(0, DAILY_ACTIVITY_DAYS)
                .mapToObj(today::plusDays)
                .forEach(date -> upcomingDailyCounts.put(date, 0L));

        Map<String, Long> upcomingServiceCounts = new LinkedHashMap<>();
        long bookingsToday = 0;
        long upcomingBookings = 0;
        long completedLast30Days = 0;
        long cancelledLast30Days = 0;
        BigDecimal scheduledValue = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        String priceCurrency = "EUR";

        for (BookingAnalyticsEntry entry : entries) {
            LocalDate bookingDate = entry.startAt().toLocalDate();
            boolean inHistory = !bookingDate.isBefore(historyStart)
                    && !bookingDate.isAfter(today);
            boolean inUpcoming = !bookingDate.isBefore(today)
                    && bookingDate.isBefore(upcomingEndExclusive);

            if (inHistory && entry.status() == BookingStatus.COMPLETED) {
                completedLast30Days++;
            }
            if (inHistory && entry.status() == BookingStatus.CANCELLED) {
                cancelledLast30Days++;
            }
            if (!inUpcoming || entry.status() != BookingStatus.CONFIRMED) {
                continue;
            }

            upcomingBookings++;
            scheduledValue = scheduledValue.add(entry.servicePrice());
            priceCurrency = entry.priceCurrency();
            upcomingServiceCounts.merge(entry.serviceName(), 1L, Long::sum);

            if (bookingDate.equals(today)) {
                bookingsToday++;
            }
            if (bookingDate.isBefore(dailyActivityEndExclusive)) {
                upcomingDailyCounts.computeIfPresent(bookingDate, (date, count) -> count + 1);
            }
        }

        TopServiceMetric topService = upcomingServiceCounts.entrySet().stream()
                .sorted(Comparator
                        .<Map.Entry<String, Long>>comparingLong(Map.Entry::getValue)
                        .reversed()
                        .thenComparing(Map.Entry::getKey, String.CASE_INSENSITIVE_ORDER))
                .map(entry -> new TopServiceMetric(entry.getKey(), entry.getValue()))
                .findFirst()
                .orElse(null);

        List<DailyBookingMetric> dailyMetrics = upcomingDailyCounts.entrySet().stream()
                .map(entry -> new DailyBookingMetric(entry.getKey(), entry.getValue()))
                .toList();

        return new DashboardAnalyticsResponse(
                today,
                upcomingEndExclusive.minusDays(1),
                bookingsToday,
                upcomingBookings,
                completedLast30Days,
                cancelledLast30Days,
                scheduledValue,
                priceCurrency,
                topService,
                dailyMetrics
        );
    }
}
