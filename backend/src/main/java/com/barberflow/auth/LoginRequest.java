package com.barberflow.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record LoginRequest(
        @NotBlank(message = "O e-mail é obrigatório.")
        @Email(message = "Introduza um e-mail válido.")
        String email,

        @NotBlank(message = "A palavra-passe é obrigatória.")
        @Size(max = 72, message = "A palavra-passe deve ter no máximo 72 caracteres.")
        String password
) {
}
