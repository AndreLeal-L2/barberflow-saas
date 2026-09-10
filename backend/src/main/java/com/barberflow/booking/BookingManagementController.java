package com.barberflow.booking;

import com.barberflow.auth.BarberFlowPrincipal;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/dashboard/bookings")
public class BookingManagementController {

    private final BookingManagementService bookingManagementService;

    public BookingManagementController(BookingManagementService bookingManagementService) {
        this.bookingManagementService = bookingManagementService;
    }

    @GetMapping
    public List<BookingResponse> list(@AuthenticationPrincipal BarberFlowPrincipal principal) {
        return bookingManagementService.list(principal.barbershopId());
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
