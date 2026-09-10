package com.barberflow.availability;

import com.barberflow.barber.Barber;
import com.barberflow.barber.BarberRepository;
import com.barberflow.barbershop.Barbershop;
import com.barberflow.barbershop.BarbershopRepository;
import com.barberflow.shared.error.BusinessRuleException;
import java.time.DayOfWeek;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AvailabilityManager {

    private final AvailabilityRuleRepository availabilityRepository;
    private final BarberRepository barberRepository;
    private final BarbershopRepository barbershopRepository;

    public AvailabilityManager(
            AvailabilityRuleRepository availabilityRepository,
            BarberRepository barberRepository,
            BarbershopRepository barbershopRepository
    ) {
        this.availabilityRepository = availabilityRepository;
        this.barberRepository = barberRepository;
        this.barbershopRepository = barbershopRepository;
    }

    @Transactional(readOnly = true)
    public List<AvailabilityDayResponse> getSchedule(UUID barbershopId) {
        Barber barber = findDefaultBarber(barbershopId);
        return availabilityRepository
                .findAllByBarbershopIdAndBarberIdAndActiveTrueOrderByDayOfWeek(
                        barbershopId,
                        barber.getId()
                )
                .stream()
                .map(AvailabilityDayResponse::from)
                .toList();
    }

    @Transactional
    public List<AvailabilityDayResponse> replaceSchedule(
            UUID barbershopId,
            AvailabilityScheduleRequest request
    ) {
        validateUniqueDays(request.days());

        Barber barber = findDefaultBarber(barbershopId);
        Barbershop barbershop = barbershopRepository.getReferenceById(barbershopId);

        availabilityRepository.deleteAllByBarbershopIdAndBarberId(
                barbershopId,
                barber.getId()
        );
        availabilityRepository.flush();

        List<AvailabilityRule> rules = request.days().stream()
                .map(day -> AvailabilityRule.create(
                        barbershop,
                        barber,
                        day.dayOfWeek(),
                        day.startTime(),
                        day.endTime()
                ))
                .toList();

        if (rules.isEmpty()) {
            barbershop.setPublished(false);
        }

        return availabilityRepository.saveAll(rules)
                .stream()
                .map(AvailabilityDayResponse::from)
                .toList();
    }

    private Barber findDefaultBarber(UUID barbershopId) {
        return barberRepository
                .findFirstByBarbershopIdAndActiveTrueOrderByDisplayOrderAsc(barbershopId)
                .orElseThrow(() -> new BusinessRuleException(
                        HttpStatus.CONFLICT,
                        "BARBER_NOT_CONFIGURED",
                        "A barbearia ainda não tem um barbeiro configurado."
                ));
    }

    private static void validateUniqueDays(List<AvailabilityDayRequest> days) {
        Set<DayOfWeek> uniqueDays = new HashSet<>();
        boolean hasDuplicate = days.stream()
                .map(AvailabilityDayRequest::dayOfWeek)
                .anyMatch(day -> !uniqueDays.add(day));

        if (hasDuplicate) {
            throw new BusinessRuleException(
                    HttpStatus.BAD_REQUEST,
                    "DUPLICATE_AVAILABILITY_DAY",
                    "Cada dia da semana só pode aparecer uma vez."
            );
        }
    }
}
