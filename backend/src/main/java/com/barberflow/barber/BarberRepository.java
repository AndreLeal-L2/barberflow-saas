package com.barberflow.barber;

import jakarta.persistence.LockModeType;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface BarberRepository extends JpaRepository<Barber, UUID> {

    Optional<Barber> findFirstByBarbershopIdAndActiveTrueOrderByDisplayOrderAsc(UUID barbershopId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            select barber
            from Barber barber
            where barber.id = :barberId
              and barber.barbershop.id = :barbershopId
              and barber.active = true
            """)
    Optional<Barber> findActiveByIdForUpdate(
            @Param("barberId") UUID barberId,
            @Param("barbershopId") UUID barbershopId
    );
}
