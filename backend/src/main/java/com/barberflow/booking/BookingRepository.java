package com.barberflow.booking;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BookingRepository extends JpaRepository<Booking, UUID> {

    List<Booking> findAllByBarbershopIdOrderByStartAtAsc(UUID barbershopId);

    Optional<Booking> findByIdAndBarbershopId(UUID bookingId, UUID barbershopId);

    List<Booking> findAllByBarberIdAndStatusNotAndStartAtLessThanAndEndAtGreaterThan(
            UUID barberId,
            BookingStatus status,
            LocalDateTime rangeEnd,
            LocalDateTime rangeStart
    );
}
