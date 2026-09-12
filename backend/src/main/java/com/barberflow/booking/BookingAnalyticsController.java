package com.barberflow.booking;

import com.barberflow.auth.BarberFlowPrincipal;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/dashboard/analytics")
public class BookingAnalyticsController {

    private final BookingAnalyticsService bookingAnalyticsService;

    public BookingAnalyticsController(BookingAnalyticsService bookingAnalyticsService) {
        this.bookingAnalyticsService = bookingAnalyticsService;
    }

    @GetMapping
    public DashboardAnalyticsResponse get(
            @AuthenticationPrincipal BarberFlowPrincipal principal
    ) {
        return bookingAnalyticsService.get(principal.barbershopId());
    }
}
