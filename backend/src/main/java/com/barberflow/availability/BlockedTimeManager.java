package com.barberflow.availability;

import com.barberflow.barber.Barber;
import com.barberflow.barber.BarberRepository;
import com.barberflow.barbershop.Barbershop;
import com.barberflow.barbershop.BarbershopRepository;
import com.barberflow.booking.BookingRepository;
import com.barberflow.booking.BookingStatus;
import com.barberflow.shared.error.BusinessRuleException;
import com.barberflow.shared.error.ResourceNotFoundException;
import java.time.Clock;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class BlockedTimeManager {

    private static final int MAX_ADVANCE_DAYS = 366;
    private static final int MAX_DURATION_DAYS = 31;

    private final BlockedTimeRepository blockedTimeRepository;
    private final BookingRepository bookingRepository;
    private final BarberRepository barberRepository;
    private final BarbershopRepository barbershopRepository;
    private final Clock clock;

    public BlockedTimeManager(
            BlockedTimeRepository blockedTimeRepository,
            BookingRepository bookingRepository,
            BarberRepository barberRepository,
            BarbershopRepository barbershopRepository,
            Clock clock
    ) {
        this.blockedTimeRepository = blockedTimeRepository;
        this.bookingRepository = bookingRepository;
        this.barberRepository = barberRepository;
        this.barbershopRepository = barbershopRepository;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public List<BlockedTimeResponse> listUpcoming(UUID barbershopId) {
        Barber barber = findDefaultBarber(barbershopId);
        return blockedTimeRepository
                .findAllByBarbershopIdAndBarberIdAndEndAtAfterOrderByStartAtAsc(
                        barbershopId,
                        barber.getId(),
                        LocalDateTime.now(clock)
                )
                .stream()
                .map(BlockedTimeResponse::from)
                .toList();
    }

    @Transactional
    public BlockedTimeResponse create(
            UUID barbershopId,
            CreateBlockedTimeRequest request
    ) {
        validateRange(request.startAt(), request.endAt());
        Barber defaultBarber = findDefaultBarber(barbershopId);
        Barber barber = barberRepository
                .findActiveByIdForUpdate(defaultBarber.getId(), barbershopId)
                .orElseThrow(() -> barberNotConfigured());

        if (blockedTimeRepository.existsByBarberIdAndStartAtLessThanAndEndAtGreaterThan(
                barber.getId(),
                request.endAt(),
                request.startAt()
        )) {
            throw new BusinessRuleException(
                    HttpStatus.CONFLICT,
                    "BLOCKED_TIME_OVERLAP",
                    "Este período sobrepõe outra indisponibilidade."
            );
        }

        boolean overlapsBooking = !bookingRepository
                .findAllByBarberIdAndStatusNotAndStartAtLessThanAndEndAtGreaterThan(
                        barber.getId(),
                        BookingStatus.CANCELLED,
                        request.endAt(),
                        request.startAt()
                )
                .isEmpty();
        if (overlapsBooking) {
            throw new BusinessRuleException(
                    HttpStatus.CONFLICT,
                    "BLOCKED_TIME_HAS_BOOKING",
                    "Já existe uma marcação confirmada neste período."
            );
        }

        Barbershop barbershop = barbershopRepository.getReferenceById(barbershopId);
        BlockedTime blockedTime = BlockedTime.create(
                barbershop,
                barber,
                request.startAt(),
                request.endAt(),
                request.reason()
        );
        return BlockedTimeResponse.from(blockedTimeRepository.save(blockedTime));
    }

    @Transactional
    public void delete(UUID barbershopId, UUID blockedTimeId) {
        BlockedTime blockedTime = blockedTimeRepository
                .findByIdAndBarbershopId(blockedTimeId, barbershopId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "BLOCKED_TIME_NOT_FOUND",
                        "A indisponibilidade não foi encontrada."
                ));
        blockedTimeRepository.delete(blockedTime);
    }

    private void validateRange(LocalDateTime startAt, LocalDateTime endAt) {
        LocalDateTime now = LocalDateTime.now(clock);
        if (!endAt.isAfter(startAt)) {
            throw invalidRange("A hora final deve ser posterior à hora inicial.");
        }
        if (!endAt.isAfter(now)) {
            throw invalidRange("A indisponibilidade deve terminar no futuro.");
        }
        if (startAt.isAfter(now.plusDays(MAX_ADVANCE_DAYS))) {
            throw invalidRange("Só pode bloquear períodos durante os próximos 12 meses.");
        }
        if (Duration.between(startAt, endAt).compareTo(Duration.ofDays(MAX_DURATION_DAYS)) > 0) {
            throw invalidRange("Uma indisponibilidade não pode exceder 31 dias.");
        }
    }

    private Barber findDefaultBarber(UUID barbershopId) {
        return barberRepository
                .findFirstByBarbershopIdAndActiveTrueOrderByDisplayOrderAsc(barbershopId)
                .orElseThrow(BlockedTimeManager::barberNotConfigured);
    }

    private static BusinessRuleException invalidRange(String message) {
        return new BusinessRuleException(
                HttpStatus.BAD_REQUEST,
                "BLOCKED_TIME_RANGE_INVALID",
                message
        );
    }

    private static BusinessRuleException barberNotConfigured() {
        return new BusinessRuleException(
                HttpStatus.CONFLICT,
                "BARBER_NOT_CONFIGURED",
                "A barbearia ainda não tem um barbeiro configurado."
        );
    }
}
