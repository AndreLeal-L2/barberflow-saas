package com.barberflow.booking;

import com.barberflow.barbershop.PublicBarbershopResponse;
import com.barberflow.servicecatalog.ServiceResponse;
import jakarta.validation.Valid;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/public/barbershops/{slug}")
public class PublicBookingController {

    private final PublicBookingService publicBookingService;

    public PublicBookingController(PublicBookingService publicBookingService) {
        this.publicBookingService = publicBookingService;
    }

    @GetMapping
    public PublicBarbershopResponse getBarbershop(@PathVariable String slug) {
        return publicBookingService.getBarbershop(slug);
    }

    @GetMapping("/services")
    public List<ServiceResponse> listServices(@PathVariable String slug) {
        return publicBookingService.listServices(slug);
    }

    @GetMapping("/available-slots")
    public List<SlotResponse> getAvailableSlots(
            @PathVariable String slug,
            @RequestParam UUID serviceId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date
    ) {
        return publicBookingService.getAvailableSlots(slug, serviceId, date);
    }

    @PostMapping("/bookings")
    @ResponseStatus(HttpStatus.CREATED)
    public BookingResponse createBooking(
            @PathVariable String slug,
            @Valid @RequestBody CreateBookingRequest request
    ) {
        return publicBookingService.createBooking(slug, request);
    }
}
