package com.barberflow.auth;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ResetPasswordRequest(
        @NotBlank(message = "O token é obrigatório.")
        @Size(max = 100, message = "O token é inválido.")
        String token,

        @NotBlank(message = "A palavra-passe é obrigatória.")
        @Size(
                min = 10,
                max = 72,
                message = "A palavra-passe deve ter entre 10 e 72 caracteres."
        )
        String password
) {
}
