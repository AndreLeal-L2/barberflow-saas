package com.barberflow.barbershop;

import java.time.LocalDate;

public record PublicBarbershopResponse(
        String name,
        String slug,
        String phone,
        String email,
        String description,
        String address,
        String logoUrl,
        String coverImageUrl,
        LocalDate bookingStartDate,
        LocalDate bookingEndDate
) {
    public static PublicBarbershopResponse from(
            Barbershop barbershop, LocalDate bookingStartDate, LocalDate bookingEndDate
    ) {
        return new PublicBarbershopResponse(
                barbershop.getName(),
                barbershop.getSlug(),
                barbershop.getPhone(),
                barbershop.getEmail(),
                barbershop.getPublicDescription(),
                barbershop.getPublicAddress(),
                barbershop.imageUrl("public", "logo"),
                barbershop.imageUrl("public", "cover"),
                bookingStartDate,
                bookingEndDate
        );
    }
}
