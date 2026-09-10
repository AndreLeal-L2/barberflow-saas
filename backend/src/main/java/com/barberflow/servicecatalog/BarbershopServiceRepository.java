package com.barberflow.servicecatalog;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BarbershopServiceRepository extends JpaRepository<BarbershopService, UUID> {

    List<BarbershopService> findAllByBarbershopIdAndActiveTrueOrderByNameAsc(UUID barbershopId);

    Optional<BarbershopService> findByIdAndBarbershopIdAndActiveTrue(
            UUID id,
            UUID barbershopId
    );

    long countByBarbershopIdAndActiveTrue(UUID barbershopId);
}
