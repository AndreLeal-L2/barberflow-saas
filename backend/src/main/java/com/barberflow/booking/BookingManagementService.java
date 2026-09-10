package com.barberflow.booking;

import com.barberflow.shared.error.BusinessRuleException;
import com.barberflow.shared.error.ResourceNotFoundException;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class BookingManagementService {

    private final BookingRepository bookingRepository;

    public BookingManagementService(BookingRepository bookingRepository) {
        this.bookingRepository = bookingRepository;
    }

    @Transactional(readOnly = true)
    public List<BookingResponse> list(UUID barbershopId) {
        return bookingRepository.findAllByBarbershopIdOrderByStartAtAsc(barbershopId)
                .stream()
                .map(BookingResponse::from)
                .toList();
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

        booking.changeStatus(request.status());
        return BookingResponse.from(booking);
    }
}
