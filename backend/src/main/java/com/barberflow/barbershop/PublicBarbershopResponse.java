package com.barberflow.barbershop;

public record PublicBarbershopResponse(
        String name,
        String slug,
        String phone,
        String email,
        String description,
        String address,
        String logoUrl,
        String coverImageUrl
) {
    public static PublicBarbershopResponse from(Barbershop barbershop) {
        return new PublicBarbershopResponse(
                barbershop.getName(),
                barbershop.getSlug(),
                barbershop.getPhone(),
                barbershop.getEmail(),
                barbershop.getPublicDescription(),
                barbershop.getPublicAddress(),
                barbershop.imageUrl("public", "logo"),
                barbershop.imageUrl("public", "cover")
        );
    }
}
