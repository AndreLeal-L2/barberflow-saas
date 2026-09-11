package com.barberflow.booking;

import java.time.LocalDateTime;
import jakarta.persistence.LockModeType;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface BookingRepository extends JpaRepository<Booking, UUID> {

    List<Booking> findAllByBarbershopIdOrderByStartAtAsc(UUID barbershopId);

    Optional<Booking> findByIdAndBarbershopId(UUID bookingId, UUID barbershopId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            select booking
            from Booking booking
            join fetch booking.barbershop
            where booking.cancellationTokenHash = :tokenHash
            """)
    Optional<Booking> findByCancellationTokenHashForUpdate(@Param("tokenHash") String tokenHash);

    @Modifying(clearAutomatically = true)
    @Query("""
            update Booking booking
            set booking.customerName = 'Cliente removido',
                booking.customerPhone = 'removido',
                booking.customerEmail = null,
                booking.cancellationTokenHash = null,
                booking.cancellationTokenExpiresAt = null,
                booking.anonymizedAt = :now,
                booking.updatedAt = :now
            where booking.endAt < :retentionCutoff
              and booking.anonymizedAt is null
            """)
    int anonymizeExpiredPersonalData(
            @Param("retentionCutoff") LocalDateTime retentionCutoff,
            @Param("now") Instant now
    );

    List<Booking> findAllByBarberIdAndStatusNotAndStartAtLessThanAndEndAtGreaterThan(
            UUID barberId,
            BookingStatus status,
            LocalDateTime rangeEnd,
            LocalDateTime rangeStart
    );
}
