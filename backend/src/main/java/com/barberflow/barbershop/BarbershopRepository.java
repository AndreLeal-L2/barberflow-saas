package com.barberflow.barbershop;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;

public interface BarbershopRepository extends JpaRepository<Barbershop, UUID> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select b from Barbershop b where b.id = :id")
    Optional<Barbershop> findForImageUpdate(@Param("id") UUID id);

    boolean existsBySlug(String slug);

    Optional<Barbershop> findBySlugAndActiveTrue(String slug);
}
