package com.barberflow.booking;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.LocalDateTime;
import java.util.UUID;

public record CreateBookingRequest(
        @NotNull UUID serviceId,
        @NotNull LocalDateTime startAt,
        @NotBlank @Size(max = 120)
        @Pattern(regexp = "^[^\\p{Cntrl}]+$", message = "O nome contém caracteres inválidos.")
        String customerName,
        @NotBlank
        @Pattern(regexp = "^[+0-9() .-]{7,30}$", message = "Introduza um número de telefone válido.")
        String customerPhone,
        @Email @Size(max = 254) String customerEmail
) {
}
