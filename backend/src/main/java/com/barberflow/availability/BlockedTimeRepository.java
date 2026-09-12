package com.barberflow.availability;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BlockedTimeRepository extends JpaRepository<BlockedTime, UUID> {

    List<BlockedTime> findAllByBarbershopIdAndBarberIdAndEndAtAfterOrderByStartAtAsc(
            UUID barbershopId,
            UUID barberId,
            LocalDateTime now
    );

    List<BlockedTime> findAllByBarberIdAndStartAtLessThanAndEndAtGreaterThan(
            UUID barberId,
            LocalDateTime rangeEnd,
            LocalDateTime rangeStart
    );

    boolean existsByBarberIdAndStartAtLessThanAndEndAtGreaterThan(
            UUID barberId,
            LocalDateTime rangeEnd,
            LocalDateTime rangeStart
    );

    Optional<BlockedTime> findByIdAndBarbershopId(UUID id, UUID barbershopId);
}
