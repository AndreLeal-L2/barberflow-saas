package com.barberflow.booking;

import com.barberflow.availability.AvailabilityRule;
import com.barberflow.availability.AvailabilityRuleRepository;
import com.barberflow.availability.BlockedTime;
import com.barberflow.availability.BlockedTimeRepository;
import com.barberflow.barber.Barber;
import com.barberflow.barber.BarberRepository;
import com.barberflow.barbershop.Barbershop;
import com.barberflow.barbershop.BarbershopRepository;
import com.barberflow.barbershop.PublicBarbershopResponse;
import com.barberflow.servicecatalog.BarbershopService;
import com.barberflow.servicecatalog.BarbershopServiceRepository;
import com.barberflow.servicecatalog.ServiceResponse;
import com.barberflow.shared.error.BusinessRuleException;
import com.barberflow.shared.error.ResourceNotFoundException;
import java.time.Clock;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PublicBookingService {

    private static final int BOOKING_HORIZON_DAYS = 60;
    private static final int SLOT_INTERVAL_MINUTES = 30;

    private final BarbershopRepository barbershopRepository;
    private final BarbershopServiceRepository serviceRepository;
    private final BarberRepository barberRepository;
    private final AvailabilityRuleRepository availabilityRepository;
    private final BlockedTimeRepository blockedTimeRepository;
    private final BookingRepository bookingRepository;
    private final BookingCancellationService cancellationService;
    private final BookingNotificationService notificationService;
    private final Clock clock;

    public PublicBookingService(
            BarbershopRepository barbershopRepository,
            BarbershopServiceRepository serviceRepository,
            BarberRepository barberRepository,
            AvailabilityRuleRepository availabilityRepository,
            BlockedTimeRepository blockedTimeRepository,
            BookingRepository bookingRepository,
            BookingCancellationService cancellationService,
            BookingNotificationService notificationService,
            Clock clock
    ) {
        this.barbershopRepository = barbershopRepository;
        this.serviceRepository = serviceRepository;
        this.barberRepository = barberRepository;
        this.availabilityRepository = availabilityRepository;
        this.blockedTimeRepository = blockedTimeRepository;
        this.bookingRepository = bookingRepository;
        this.cancellationService = cancellationService;
        this.notificationService = notificationService;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public PublicBarbershopResponse getBarbershop(String slug) {
        return PublicBarbershopResponse.from(findPublicBarbershop(slug));
    }

    @Transactional(readOnly = true)
    public List<ServiceResponse> listServices(String slug) {
        Barbershop barbershop = findPublicBarbershop(slug);
        return serviceRepository
                .findAllByBarbershopIdAndActiveTrueOrderByNameAsc(barbershop.getId())
                .stream()
                .map(ServiceResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<SlotResponse> getAvailableSlots(
            String slug,
            UUID serviceId,
            LocalDate date
    ) {
        Barbershop barbershop = findPublicBarbershop(slug);
        BarbershopService service = findService(serviceId, barbershop.getId());
        Barber barber = findDefaultBarber(barbershop.getId());
        validateDate(date);

        return calculateAvailableSlots(barbershop, barber, service, date);
    }

    @Transactional
    public BookingResponse createBooking(String slug, CreateBookingRequest request) {
        Barbershop barbershop = findPublicBarbershop(slug);
        BarbershopService service = findService(request.serviceId(), barbershop.getId());
        Barber defaultBarber = findDefaultBarber(barbershop.getId());
        Barber lockedBarber = barberRepository
                .findActiveByIdForUpdate(defaultBarber.getId(), barbershop.getId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "BARBER_NOT_FOUND",
                        "O barbeiro não está disponível."
                ));

        LocalDate bookingDate = request.startAt().toLocalDate();
        validateDate(bookingDate);
        LocalDateTime endAt = request.startAt().plusMinutes(service.getDurationMinutes());
        AvailabilityRule rule = findRule(barbershop.getId(), lockedBarber.getId(), bookingDate);

        validateRequestedSlot(request.startAt(), endAt, rule);

        List<Booking> activeBookings = findActiveBookingsForDay(
                lockedBarber.getId(),
                bookingDate
        );
        if (overlaps(activeBookings, request.startAt(), endAt)) {
            throw slotUnavailable();
        }
        if (overlapsBlockedTimes(
                findBlockedTimes(lockedBarber.getId(), request.startAt(), endAt),
                request.startAt(),
                endAt
        )) {
            throw slotUnavailable();
        }

        Booking booking = Booking.create(
                barbershop,
                lockedBarber,
                service,
                request.customerName(),
                request.customerPhone(),
                request.customerEmail(),
                request.startAt(),
                endAt
        );
        Booking savedBooking = bookingRepository.save(booking);
        String cancellationToken = cancellationService.enableCancellation(savedBooking);
        notificationService.bookingCreated(savedBooking, cancellationToken);
        return BookingResponse.from(savedBooking);
    }

    private List<SlotResponse> calculateAvailableSlots(
            Barbershop barbershop,
            Barber barber,
            BarbershopService service,
            LocalDate date
    ) {
        AvailabilityRule rule = availabilityRepository
                .findByBarbershopIdAndBarberIdAndDayOfWeekAndActiveTrue(
                        barbershop.getId(),
                        barber.getId(),
                        date.getDayOfWeek()
                )
                .orElse(null);
        if (rule == null) {
            return List.of();
        }

        List<Booking> activeBookings = findActiveBookingsForDay(barber.getId(), date);
        List<BlockedTime> blockedTimes = findBlockedTimes(
                barber.getId(),
                date.atStartOfDay(),
                date.plusDays(1).atStartOfDay()
        );
        LocalDateTime now = LocalDateTime.now(clock);
        LocalDateTime cursor = LocalDateTime.of(date, rule.getStartTime());
        LocalDateTime workEnd = LocalDateTime.of(date, rule.getEndTime());
        List<SlotResponse> slots = new ArrayList<>();

        while (!cursor.plusMinutes(service.getDurationMinutes()).isAfter(workEnd)) {
            LocalDateTime slotEnd = cursor.plusMinutes(service.getDurationMinutes());
            if (cursor.isAfter(now)
                    && !overlaps(activeBookings, cursor, slotEnd)
                    && !overlapsBlockedTimes(blockedTimes, cursor, slotEnd)) {
                slots.add(new SlotResponse(cursor, slotEnd));
            }
            cursor = cursor.plusMinutes(SLOT_INTERVAL_MINUTES);
        }
        return slots;
    }

    private List<Booking> findActiveBookingsForDay(UUID barberId, LocalDate date) {
        return bookingRepository
                .findAllByBarberIdAndStatusNotAndStartAtLessThanAndEndAtGreaterThan(
                        barberId,
                        BookingStatus.CANCELLED,
                        date.plusDays(1).atStartOfDay(),
                        date.atStartOfDay()
                );
    }

    private List<BlockedTime> findBlockedTimes(
            UUID barberId,
            LocalDateTime rangeStart,
            LocalDateTime rangeEnd
    ) {
        return blockedTimeRepository
                .findAllByBarberIdAndStartAtLessThanAndEndAtGreaterThan(
                        barberId,
                        rangeEnd,
                        rangeStart
                );
    }

    private void validateRequestedSlot(
            LocalDateTime startAt,
            LocalDateTime endAt,
            AvailabilityRule rule
    ) {
        LocalDateTime workStart = LocalDateTime.of(startAt.toLocalDate(), rule.getStartTime());
        LocalDateTime workEnd = LocalDateTime.of(startAt.toLocalDate(), rule.getEndTime());
        long offsetMinutes = Duration.between(workStart, startAt).toMinutes();

        boolean outsideSchedule = startAt.isBefore(workStart) || endAt.isAfter(workEnd);
        boolean invalidIncrement = offsetMinutes < 0
                || offsetMinutes % SLOT_INTERVAL_MINUTES != 0;
        if (outsideSchedule || invalidIncrement || !startAt.isAfter(LocalDateTime.now(clock))) {
            throw slotUnavailable();
        }
    }

    private AvailabilityRule findRule(UUID barbershopId, UUID barberId, LocalDate date) {
        return availabilityRepository
                .findByBarbershopIdAndBarberIdAndDayOfWeekAndActiveTrue(
                        barbershopId,
                        barberId,
                        date.getDayOfWeek()
                )
                .orElseThrow(PublicBookingService::slotUnavailable);
    }

    private Barbershop findPublicBarbershop(String slug) {
        Barbershop barbershop = barbershopRepository
                .findBySlugAndActiveTrue(slug)
                .filter(Barbershop::isPublished)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "BARBERSHOP_NOT_FOUND",
                        "A página de marcações não está disponível."
                ));
        if (!barbershop.getSubscriptionStatus().grantsBookingAccess()) {
            throw new BusinessRuleException(
                    HttpStatus.CONFLICT,
                    "SUBSCRIPTION_INACTIVE",
                    "A página de marcações está temporariamente indisponível."
            );
        }
        return barbershop;
    }

    private BarbershopService findService(UUID serviceId, UUID barbershopId) {
        return serviceRepository
                .findByIdAndBarbershopIdAndActiveTrue(serviceId, barbershopId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "SERVICE_NOT_FOUND",
                        "O serviço selecionado não está disponível."
                ));
    }

    private Barber findDefaultBarber(UUID barbershopId) {
        return barberRepository
                .findFirstByBarbershopIdAndActiveTrueOrderByDisplayOrderAsc(barbershopId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "BARBER_NOT_FOUND",
                        "O barbeiro não está disponível."
                ));
    }

    private void validateDate(LocalDate date) {
        LocalDate today = LocalDate.now(clock);
        if (date.isBefore(today) || date.isAfter(today.plusDays(BOOKING_HORIZON_DAYS))) {
            throw new BusinessRuleException(
                    HttpStatus.BAD_REQUEST,
                    "BOOKING_DATE_INVALID",
                    "Escolha uma data dentro dos próximos 60 dias."
            );
        }
    }

    private static boolean overlaps(
            List<Booking> bookings,
            LocalDateTime startAt,
            LocalDateTime endAt
    ) {
        return bookings.stream().anyMatch(booking ->
                booking.getStartAt().isBefore(endAt) && booking.getEndAt().isAfter(startAt)
        );
    }

    private static boolean overlapsBlockedTimes(
            List<BlockedTime> blockedTimes,
            LocalDateTime startAt,
            LocalDateTime endAt
    ) {
        return blockedTimes.stream().anyMatch(blockedTime ->
                blockedTime.getStartAt().isBefore(endAt)
                        && blockedTime.getEndAt().isAfter(startAt)
        );
    }

    private static BusinessRuleException slotUnavailable() {
        return new BusinessRuleException(
                HttpStatus.CONFLICT,
                "BOOKING_SLOT_UNAVAILABLE",
                "O horário selecionado já não está disponível."
        );
    }
}
