package com.barberflow.barbershop;

import java.text.Normalizer;
import java.util.Locale;
import org.springframework.stereotype.Component;

@Component
public class SlugGenerator {

    private static final int MAX_SLUG_LENGTH = 70;

    public String from(String value) {
        String normalized = Normalizer.normalize(value, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("^-|-$", "");

        if (normalized.isBlank()) {
            normalized = "barbearia";
        }

        return normalized.substring(0, Math.min(normalized.length(), MAX_SLUG_LENGTH))
                .replaceAll("-$", "");
    }
}
