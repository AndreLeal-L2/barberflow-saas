package com.barberflow.booking;

import com.barberflow.auth.MessageResponse;
import com.barberflow.auth.TokenRequest;
import com.barberflow.config.RequestRateLimiter;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/public/bookings")
public class PublicBookingCancellationController {

    private final BookingCancellationService cancellationService;
    private final RequestRateLimiter requestRateLimiter;

    public PublicBookingCancellationController(
            BookingCancellationService cancellationService,
            RequestRateLimiter requestRateLimiter
    ) {
        this.cancellationService = cancellationService;
        this.requestRateLimiter = requestRateLimiter;
    }

    @PostMapping("/cancel")
    public MessageResponse cancel(
            @Valid @RequestBody TokenRequest request,
            HttpServletRequest httpRequest
    ) {
        requestRateLimiter.checkTokenAttempt(httpRequest);
        cancellationService.cancel(request.token());
        return new MessageResponse("A marcação foi cancelada.");
    }
}
