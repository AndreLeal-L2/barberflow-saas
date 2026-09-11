package com.barberflow.auth;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record TokenRequest(
        @NotBlank(message = "O token é obrigatório.")
        @Size(max = 100, message = "O token é inválido.")
        String token
) {
}
