package com.barberflow.availability;

import com.barberflow.auth.BarberFlowPrincipal;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/dashboard/availability")
public class AvailabilityController {

    private final AvailabilityManager availabilityManager;

    public AvailabilityController(AvailabilityManager availabilityManager) {
        this.availabilityManager = availabilityManager;
    }

    @GetMapping
    public List<AvailabilityDayResponse> getSchedule(
            @AuthenticationPrincipal BarberFlowPrincipal principal
    ) {
        return availabilityManager.getSchedule(principal.barbershopId());
    }

    @PutMapping
    public List<AvailabilityDayResponse> replaceSchedule(
            @AuthenticationPrincipal BarberFlowPrincipal principal,
            @Valid @RequestBody AvailabilityScheduleRequest request
    ) {
        return availabilityManager.replaceSchedule(principal.barbershopId(), request);
    }
}
