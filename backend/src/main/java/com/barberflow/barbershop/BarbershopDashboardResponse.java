package com.barberflow.barbershop;

import com.barberflow.subscription.SubscriptionStatus;
import java.util.UUID;

public record BarbershopDashboardResponse(
        UUID id,
        String name,
        String slug,
        String phone,
        String email,
        String publicDescription,
        String publicAddress,
        String logoUrl,
        String coverImageUrl,
        boolean published,
        SubscriptionStatus subscriptionStatus,
        long serviceCount,
        long availabilityDayCount,
        int completedSetupSteps,
        boolean canPublish,
        String timeZone
) {
    public static BarbershopDashboardResponse from(
            Barbershop barbershop,
            long serviceCount,
            long availabilityDayCount,
            String timeZone
    ) {
        boolean canPublish = serviceCount > 0
                && availabilityDayCount > 0
                && barbershop.getSubscriptionStatus().grantsBookingAccess();
        int completedSteps = 1
                + (serviceCount > 0 ? 1 : 0)
                + (availabilityDayCount > 0 ? 1 : 0)
                + (barbershop.isPublished() ? 1 : 0);

        return new BarbershopDashboardResponse(
                barbershop.getId(),
                barbershop.getName(),
                barbershop.getSlug(),
                barbershop.getPhone(),
                barbershop.getEmail(),
                barbershop.getPublicDescription(),
                barbershop.getPublicAddress(),
                barbershop.imageUrl("dashboard", "logo"),
                barbershop.imageUrl("dashboard", "cover"),
                barbershop.isPublished(),
                barbershop.getSubscriptionStatus(),
                serviceCount,
                availabilityDayCount,
                completedSteps,
                canPublish,
                timeZone
        );
    }
}
