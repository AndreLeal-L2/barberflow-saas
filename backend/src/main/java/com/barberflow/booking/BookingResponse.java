package com.barberflow.booking;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

public record BookingResponse(
        UUID id,
        String customerName,
        String customerPhone,
        String customerEmail,
        LocalDateTime startAt,
        LocalDateTime endAt,
        String serviceName,
        int serviceDurationMinutes,
        BigDecimal servicePrice,
        String priceCurrency,
        BookingStatus status
) {
    public static BookingResponse from(Booking booking) {
        return new BookingResponse(
                booking.getId(),
                booking.getCustomerName(),
                booking.getCustomerPhone(),
                booking.getCustomerEmail(),
                booking.getStartAt(),
                booking.getEndAt(),
                booking.getServiceNameSnapshot(),
                booking.getServiceDurationSnapshot(),
                booking.getServicePriceSnapshot(),
                booking.getPriceCurrency(),
                booking.getStatus()
        );
    }
}
