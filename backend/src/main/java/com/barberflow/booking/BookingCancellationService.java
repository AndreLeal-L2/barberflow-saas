package com.barberflow.booking;

import com.barberflow.shared.error.BusinessRuleException;
import com.barberflow.shared.security.SecureTokenGenerator;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDateTime;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class BookingCancellationService {

    private final BookingRepository bookingRepository;
    private final BookingNotificationService notificationService;
    private final SecureTokenGenerator tokenGenerator;
    private final Clock clock;
    private final int minimumNoticeHours;

    public BookingCancellationService(
            BookingRepository bookingRepository,
            BookingNotificationService notificationService,
            SecureTokenGenerator tokenGenerator,
            Clock clock,
            @Value("${app.booking.customer-cancellation-min-hours}") int minimumNoticeHours
    ) {
        this.bookingRepository = bookingRepository;
        this.notificationService = notificationService;
        this.tokenGenerator = tokenGenerator;
        this.clock = clock;
        this.minimumNoticeHours = minimumNoticeHours;
    }

    public String enableCancellation(Booking booking) {
        String rawToken = tokenGenerator.generate();
        Instant expiresAt = booking.getStartAt().atZone(clock.getZone()).toInstant();
        booking.enableCustomerCancellation(tokenGenerator.hash(rawToken), expiresAt);
        return rawToken;
    }

    @Transactional
    public void cancel(String rawToken) {
        Booking booking = bookingRepository
                .findByCancellationTokenHashForUpdate(tokenGenerator.hash(rawToken))
                .orElseThrow(BookingCancellationService::invalidToken);
        Instant now = Instant.now(clock);

        if (booking.getCancellationTokenExpiresAt() == null
                || !booking.getCancellationTokenExpiresAt().isAfter(now)) {
            throw invalidToken();
        }
        if (booking.getStatus() != BookingStatus.CONFIRMED) {
            throw new BusinessRuleException(
                    HttpStatus.CONFLICT,
                    "BOOKING_ALREADY_CLOSED",
                    "Esta marcação já foi concluída ou cancelada."
            );
        }
        LocalDateTime cancellationDeadline = booking.getStartAt().minusHours(minimumNoticeHours);
        if (LocalDateTime.now(clock).isAfter(cancellationDeadline)) {
            throw new BusinessRuleException(
                    HttpStatus.CONFLICT,
                    "BOOKING_CANCELLATION_TOO_LATE",
                    "O cancelamento online encerrou. Contacte diretamente a barbearia."
            );
        }

        booking.cancelByCustomer(now);
        notificationService.cancelledByCustomer(booking);
    }

    private static BusinessRuleException invalidToken() {
        return new BusinessRuleException(
                HttpStatus.BAD_REQUEST,
                "BOOKING_CANCELLATION_TOKEN_INVALID",
                "Este link de cancelamento é inválido ou já expirou."
        );
    }
}
