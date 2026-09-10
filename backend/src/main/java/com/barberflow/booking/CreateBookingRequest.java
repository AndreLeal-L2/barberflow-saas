package com.barberflow.booking;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDateTime;
import java.util.UUID;

public record CreateBookingRequest(
        @NotNull UUID serviceId,
        @NotNull LocalDateTime startAt,
        @NotBlank @Size(max = 120) String customerName,
        @NotBlank @Size(max = 30) String customerPhone,
        @Email @Size(max = 254) String customerEmail
) {
}
