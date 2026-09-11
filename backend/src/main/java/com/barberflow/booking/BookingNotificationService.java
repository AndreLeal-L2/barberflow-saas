package com.barberflow.booking;

import com.barberflow.notification.NotificationOutboxService;
import java.time.format.DateTimeFormatter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class BookingNotificationService {

    private static final DateTimeFormatter DATE_TIME_FORMAT =
            DateTimeFormatter.ofPattern("dd/MM/yyyy 'às' HH:mm");

    private final NotificationOutboxService notificationService;
    private final String publicBaseUrl;

    public BookingNotificationService(
            NotificationOutboxService notificationService,
            @Value("${app.public-base-url}") String publicBaseUrl
    ) {
        this.notificationService = notificationService;
        this.publicBaseUrl = publicBaseUrl.replaceAll("/+$", "");
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

        if (booking.getCustomerEmail() != null) {
            String cancellationLink = publicBaseUrl
                    + "/cancel-booking?token=" + cancellationToken;
            notificationService.enqueue(
                    "BOOKING_CONFIRMATION_CUSTOMER",
                    booking.getCustomerEmail(),
                    "Marcação confirmada em " + booking.getBarbershop().getName(),
                    "Olá " + booking.getCustomerName() + ",\n\nA sua marcação está confirmada."
                            + "\nServiço: " + booking.getServiceNameSnapshot()
                            + "\nData: " + appointment
                            + "\nLocal: " + booking.getBarbershop().getName()
                            + "\n\nPara cancelar, utilize este link:\n" + cancellationLink
            );
        }
    }

    public void cancelledByCustomer(Booking booking) {
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
        notifyCustomerOfCancellation(booking);
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
}
