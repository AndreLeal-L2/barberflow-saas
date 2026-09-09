package com.barberflow.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record RegisterRequest(
        @NotBlank(message = "O nome do responsável é obrigatório.")
        @Size(max = 120, message = "O nome do responsável deve ter no máximo 120 caracteres.")
        String ownerName,

        @NotBlank(message = "O nome da barbearia é obrigatório.")
        @Size(max = 120, message = "O nome da barbearia deve ter no máximo 120 caracteres.")
        String barbershopName,

        @NotBlank(message = "O e-mail é obrigatório.")
        @Email(message = "Introduza um e-mail válido.")
        @Size(max = 254, message = "O e-mail deve ter no máximo 254 caracteres.")
        String email,

        @NotBlank(message = "O telefone é obrigatório.")
        @Pattern(
                regexp = "^[+0-9() .-]{7,30}$",
                message = "Introduza um número de telefone válido."
        )
        String phone,

        @NotBlank(message = "A palavra-passe é obrigatória.")
        @Size(
                min = 8,
                max = 72,
                message = "A palavra-passe deve ter entre 8 e 72 caracteres."
        )
        String password
) {
}
