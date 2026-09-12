package com.barberflow.booking;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record BookingAnalyticsEntry(
        LocalDateTime startAt,
        String serviceName,
        BigDecimal servicePrice,
        String priceCurrency,
        BookingStatus status
) {
}
