package com.barberflow.booking;

import com.barberflow.shared.error.BusinessRuleException;
import com.barberflow.shared.error.ResourceNotFoundException;
import java.util.List;
import java.util.UUID;
import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.Set;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class BookingManagementService {

    private final BookingRepository bookingRepository;
    private final BookingNotificationService notificationService;
    private final BookingReadRepository readRepository;
    private final Clock clock;

    public BookingManagementService(
            BookingRepository bookingRepository,
            BookingNotificationService notificationService,
            BookingReadRepository readRepository,
            Clock clock
    ) {
        this.bookingRepository = bookingRepository;
        this.notificationService = notificationService;
        this.readRepository = readRepository;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public List<BookingResponse> list(UUID barbershopId) {
        return bookingRepository.findAllByBarbershopIdOrderByStartAtAsc(barbershopId)
                .stream()
                .map(BookingResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<BookingResponse> list(UUID shopId, LocalDate from, LocalDate to,
                                      String view, int page, int size) {
        if (page < 0 || page > 10000 || size < 1 || size > 100
                || (view != null && !Set.of("upcoming", "history", "next").contains(view))) {
            throw invalidQuery();
        }
        if (from != null || to != null) {
            if (from == null || to == null || !to.isAfter(from)
                    || ChronoUnit.DAYS.between(from, to) > 31 || view != null) throw invalidQuery();
            return readRepository.inRange(shopId, from.atStartOfDay(), to.atStartOfDay())
                    .stream().map(BookingResponse::from).toList();
        }
        if (view == null) return list(shopId); // Compatibility for existing API clients.
        return readRepository.page(shopId, LocalDateTime.now(clock), view, page, size)
                .stream().map(BookingResponse::from).toList();
    }

    private static BusinessRuleException invalidQuery() {
        return new BusinessRuleException(HttpStatus.BAD_REQUEST, "BOOKING_QUERY_INVALID",
                "Escolha um intervalo até 31 dias ou uma página de 1 a 100 marcações.");
    }

    @Transactional
    public BookingResponse updateStatus(
            UUID barbershopId,
            UUID bookingId,
            UpdateBookingStatusRequest request
    ) {
        Booking booking = bookingRepository
                .findByIdAndBarbershopId(bookingId, barbershopId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "BOOKING_NOT_FOUND",
                        "A marcação não foi encontrada."
                ));

        if (request.status() == BookingStatus.CONFIRMED) {
            throw new BusinessRuleException(
                    HttpStatus.BAD_REQUEST,
                    "BOOKING_STATUS_INVALID",
                    "Só é possível concluir ou cancelar uma marcação."
            );
        }
        if (booking.getStatus() != BookingStatus.CONFIRMED) {
            throw new BusinessRuleException(
                    HttpStatus.CONFLICT,
                    "BOOKING_ALREADY_CLOSED",
                    "Esta marcação já foi concluída ou cancelada."
            );
        }

        if (request.status() == BookingStatus.COMPLETED
                && booking.getStartAt().isAfter(LocalDateTime.now(clock))) {
            throw new BusinessRuleException(
                    HttpStatus.CONFLICT,
                    "BOOKING_NOT_STARTED",
                    "Só é possível concluir a marcação depois de começar."
            );
        }

        booking.changeStatus(request.status());
        if (request.status() == BookingStatus.CANCELLED) {
            notificationService.cancelledByOwner(booking);
        } else {
            notificationService.cancelReminders(booking);
        }
        return BookingResponse.from(booking);
    }
}
