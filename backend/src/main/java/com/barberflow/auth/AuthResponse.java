package com.barberflow.auth;

import com.barberflow.subscription.SubscriptionStatus;
import java.util.UUID;

public record AuthResponse(
        UUID id,
        String name,
        String email,
        boolean emailVerified,
        boolean emailVerificationRequired,
        UserRole role,
        BarbershopSummary barbershop
) {

    public static AuthResponse from(
            BarberFlowPrincipal principal,
            boolean emailVerificationRequired
    ) {
        return new AuthResponse(
                principal.userId(),
                principal.name(),
                principal.getUsername(),
                principal.emailVerified(),
                emailVerificationRequired,
                principal.role(),
                new BarbershopSummary(
                        principal.barbershopId(),
                        principal.barbershopName(),
                        principal.barbershopSlug(),
                        principal.subscriptionStatus()
                )
        );
    }

    public record BarbershopSummary(
            UUID id,
            String name,
            String slug,
            SubscriptionStatus subscriptionStatus
    ) {
    }
}
