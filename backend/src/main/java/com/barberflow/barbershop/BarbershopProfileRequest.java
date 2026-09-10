package com.barberflow.barbershop;

import jakarta.validation.constraints.Size;

public record BarbershopProfileRequest(
        @Size(max = 500) String publicDescription,
        @Size(max = 255) String publicAddress
) {
}
