package com.barberflow.availability;

import java.time.DayOfWeek;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AvailabilityRuleRepository extends JpaRepository<AvailabilityRule, UUID> {

    List<AvailabilityRule> findAllByBarbershopIdAndBarberIdAndActiveTrueOrderByDayOfWeek(
            UUID barbershopId,
            UUID barberId
    );

    Optional<AvailabilityRule> findByBarbershopIdAndBarberIdAndDayOfWeekAndActiveTrue(
            UUID barbershopId,
            UUID barberId,
            DayOfWeek dayOfWeek
    );

    void deleteAllByBarbershopIdAndBarberId(UUID barbershopId, UUID barberId);

    long countByBarbershopIdAndActiveTrue(UUID barbershopId);
}
