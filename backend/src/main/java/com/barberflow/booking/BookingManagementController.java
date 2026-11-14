package com.barberflow.booking;

import com.barberflow.auth.BarberFlowPrincipal;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import java.time.LocalDate;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.RequestParam;

@RestController
@RequestMapping("/api/dashboard/bookings")
public class BookingManagementController {

    private final BookingManagementService bookingManagementService;

    public BookingManagementController(BookingManagementService bookingManagementService) {
        this.bookingManagementService = bookingManagementService;
    }

    @GetMapping
    public List<BookingResponse> list(@AuthenticationPrincipal BarberFlowPrincipal principal,
            @RequestParam(required = false) LocalDate from,
            @RequestParam(required = false) LocalDate to,
            @RequestParam(required = false) String view,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        return bookingManagementService.list(principal.barbershopId(), from, to, view, page, size);
    }

    @PatchMapping("/{bookingId}/status")
    public BookingResponse updateStatus(
            @AuthenticationPrincipal BarberFlowPrincipal principal,
            @PathVariable UUID bookingId,
            @Valid @RequestBody UpdateBookingStatusRequest request
    ) {
        return bookingManagementService.updateStatus(
                principal.barbershopId(),
                bookingId,
                request
        );
    }
}
