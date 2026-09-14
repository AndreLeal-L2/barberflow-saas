package com.barberflow.booking;

import com.barberflow.notification.NotificationOutboxService;
import java.time.Clock;
import java.time.Instant;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class BookingNotificationService {

    private static final DateTimeFormatter DATE_TIME_FORMAT =
            DateTimeFormatter.ofPattern("dd/MM/yyyy 'às' HH:mm");

    private final NotificationOutboxService notificationService;
    private final String publicBaseUrl;
    private final Clock clock;

    public BookingNotificationService(
            NotificationOutboxService notificationService,
            @Value("${app.public-base-url}") String publicBaseUrl,
            Clock clock
    ) {
        this.notificationService = notificationService;
        this.publicBaseUrl = publicBaseUrl.replaceAll("/+$", "");
        this.clock = clock;
    }

    public void bookingCreated(Booking booking, String cancellationToken) {
        String appointment = booking.getStartAt().format(DATE_TIME_FORMAT);
        notificationService.enqueue(
                "NEW_BOOKING_OWNER",
                booking.getBarbershop().getEmail(),
                "Nova marcação: " + booking.getServiceNameSnapshot(),
                "Nova marcação no BarberFlow.\n\nCliente: " + booking.getCustomerName()
                        + "\nTelefone: " + booking.getCustomerPhone()
                        + "\nServiço: " + booking.getServiceNameSnapshot()
                        + "\nData: " + appointment
                        + "\n\nConsulte a agenda no painel."
        );

        if (booking.getCustomerEmail() == null) {
            return;
        }

        Instant now = Instant.now(clock);
        Instant appointmentInstant = booking.getStartAt()
                .atZone(clock.getZone())
                .toInstant();
        String cancellationLink = publicBaseUrl
                + "/cancel-booking?token=" + cancellationToken;
        String bookingDetails = "\nServiço: " + booking.getServiceNameSnapshot()
                + "\nData: " + appointment
                + "\nLocal: " + booking.getBarbershop().getName()
                + "\n\nPara cancelar, utilize este link:\n" + cancellationLink;

        notificationService.enqueueForBooking(
                "BOOKING_CONFIRMATION_CUSTOMER",
                booking.getCustomerEmail(),
                "Marcação confirmada em " + booking.getBarbershop().getName(),
                "Olá " + booking.getCustomerName() + ",\n\nA sua marcação está confirmada."
                        + bookingDetails,
                booking.getId(),
                now
        );
        scheduleReminder(
                booking,
                "BOOKING_REMINDER_24H",
                "Lembrete: marcação amanhã",
                "Olá " + booking.getCustomerName()
                        + ",\n\nA sua marcação é dentro de 24 horas.",
                bookingDetails,
                appointmentInstant.minus(24, ChronoUnit.HOURS),
                now
        );
        scheduleReminder(
                booking,
                "BOOKING_REMINDER_3H",
                "Lembrete: marcação dentro de 3 horas",
                "Olá " + booking.getCustomerName()
                        + ",\n\nA sua marcação começa dentro de 3 horas.",
                bookingDetails,
                appointmentInstant.minus(3, ChronoUnit.HOURS),
                now
        );
    }

    public void cancelledByCustomer(Booking booking) {
        cancelReminders(booking);
        notificationService.enqueue(
                "BOOKING_CANCELLED_OWNER",
                booking.getBarbershop().getEmail(),
                "Marcação cancelada pelo cliente",
                "A marcação de " + booking.getCustomerName() + " para "
                        + booking.getStartAt().format(DATE_TIME_FORMAT)
                        + " foi cancelada pelo cliente."
        );
        notifyCustomerOfCancellation(booking);
    }

    public void cancelledByOwner(Booking booking) {
        cancelReminders(booking);
        notifyCustomerOfCancellation(booking);
    }

    public void cancelReminders(Booking booking) {
        notificationService.cancelFutureBookingReminders(booking.getId());
    }

    private void notifyCustomerOfCancellation(Booking booking) {
        if (booking.getCustomerEmail() == null) {
            return;
        }
        notificationService.enqueue(
                "BOOKING_CANCELLED_CUSTOMER",
                booking.getCustomerEmail(),
                "Marcação cancelada em " + booking.getBarbershop().getName(),
                "Olá " + booking.getCustomerName() + ",\n\nA marcação de "
                        + booking.getStartAt().format(DATE_TIME_FORMAT)
                        + " foi cancelada."
        );
    }

    private void scheduleReminder(
            Booking booking,
            String type,
            String subject,
            String introduction,
            String bookingDetails,
            Instant scheduledFor,
            Instant now
    ) {
        if (!scheduledFor.isAfter(now)) {
            return;
        }
        notificationService.enqueueForBooking(
                type,
                booking.getCustomerEmail(),
                subject + " em " + booking.getBarbershop().getName(),
                introduction + bookingDetails,
                booking.getId(),
                scheduledFor
        );
    }
}
