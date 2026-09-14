package com.barberflow.booking;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.barberflow.barbershop.Barbershop;
import com.barberflow.notification.NotificationOutboxService;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class BookingNotificationServiceTest {

    private static final ZoneId LISBON = ZoneId.of("Europe/Lisbon");
    private static final Instant NOW = Instant.parse("2026-09-14T10:00:00Z");

    @Test
    void shouldQueueConfirmationAndBothBookingReminders() {
        NotificationOutboxService outboxService = mock(NotificationOutboxService.class);
        BookingNotificationService service = service(outboxService);
        UUID bookingId = UUID.randomUUID();
        Booking booking = booking(bookingId, LocalDateTime.of(2026, 9, 16, 15, 0));

        service.bookingCreated(booking, "cancel-token");

        verify(outboxService).enqueueForBooking(
                eq("BOOKING_CONFIRMATION_CUSTOMER"),
                eq("client@example.com"),
                anyString(),
                anyString(),
                eq(bookingId),
                eq(NOW)
        );
        verify(outboxService).enqueueForBooking(
                eq("BOOKING_REMINDER_24H"),
                eq("client@example.com"),
                anyString(),
                anyString(),
                eq(bookingId),
                eq(Instant.parse("2026-09-15T14:00:00Z"))
        );
        verify(outboxService).enqueueForBooking(
                eq("BOOKING_REMINDER_3H"),
                eq("client@example.com"),
                anyString(),
                anyString(),
                eq(bookingId),
                eq(Instant.parse("2026-09-16T11:00:00Z"))
        );
    }

    @Test
    void shouldSkipReminderWhoseDeliveryTimeHasAlreadyPassed() {
        NotificationOutboxService outboxService = mock(NotificationOutboxService.class);
        BookingNotificationService service = service(outboxService);
        UUID bookingId = UUID.randomUUID();
        Booking booking = booking(
                bookingId,
                LocalDateTime.of(2026, 9, 15, 7, 0)
        );

        service.bookingCreated(booking, "cancel-token");

        verify(outboxService, never()).enqueueForBooking(
                eq("BOOKING_REMINDER_24H"),
                anyString(),
                anyString(),
                anyString(),
                eq(bookingId),
                eq(Instant.parse("2026-09-14T06:00:00Z"))
        );
        verify(outboxService).enqueueForBooking(
                eq("BOOKING_REMINDER_3H"),
                eq("client@example.com"),
                anyString(),
                anyString(),
                eq(bookingId),
                eq(Instant.parse("2026-09-15T03:00:00Z"))
        );
    }

    @Test
    void shouldCancelFutureRemindersWhenOwnerCancelsBooking() {
        NotificationOutboxService outboxService = mock(NotificationOutboxService.class);
        BookingNotificationService service = service(outboxService);
        Booking booking = booking(UUID.randomUUID(), LocalDateTime.of(2026, 9, 16, 15, 0));

        service.cancelledByOwner(booking);

        verify(outboxService).cancelFutureBookingReminders(booking.getId());
    }

    private BookingNotificationService service(NotificationOutboxService outboxService) {
        return new BookingNotificationService(
                outboxService,
                "https://barberflow.example",
                Clock.fixed(NOW, LISBON)
        );
    }

    private Booking booking(UUID bookingId, LocalDateTime startAt) {
        Barbershop barbershop = mock(Barbershop.class);
        when(barbershop.getName()).thenReturn("Barbearia Central");
        when(barbershop.getEmail()).thenReturn("owner@example.com");

        Booking booking = mock(Booking.class);
        when(booking.getId()).thenReturn(bookingId);
        when(booking.getBarbershop()).thenReturn(barbershop);
        when(booking.getCustomerName()).thenReturn("João Silva");
        when(booking.getCustomerPhone()).thenReturn("+351912345678");
        when(booking.getCustomerEmail()).thenReturn("client@example.com");
        when(booking.getServiceNameSnapshot()).thenReturn("Corte clássico");
        when(booking.getStartAt()).thenReturn(startAt);
        return booking;
    }
}
