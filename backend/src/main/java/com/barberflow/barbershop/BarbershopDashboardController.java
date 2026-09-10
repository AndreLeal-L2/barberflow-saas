package com.barberflow.barbershop;

import com.barberflow.auth.BarberFlowPrincipal;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/dashboard/barbershop")
public class BarbershopDashboardController {

    private final BarbershopManager barbershopManager;

    public BarbershopDashboardController(BarbershopManager barbershopManager) {
        this.barbershopManager = barbershopManager;
    }

    @GetMapping
    public BarbershopDashboardResponse get(
            @AuthenticationPrincipal BarberFlowPrincipal principal
    ) {
        return barbershopManager.get(principal.barbershopId());
    }

    @PutMapping("/profile")
    public BarbershopDashboardResponse updateProfile(
            @AuthenticationPrincipal BarberFlowPrincipal principal,
            @Valid @RequestBody BarbershopProfileRequest request
    ) {
        return barbershopManager.updateProfile(principal.barbershopId(), request);
    }

    @PatchMapping("/publication")
    public BarbershopDashboardResponse updatePublication(
            @AuthenticationPrincipal BarberFlowPrincipal principal,
            @RequestBody PublicationRequest request
    ) {
        return barbershopManager.updatePublication(principal.barbershopId(), request);
    }
}
