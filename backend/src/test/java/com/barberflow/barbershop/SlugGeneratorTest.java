package com.barberflow.barbershop;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class SlugGeneratorTest {

    private final SlugGenerator slugGenerator = new SlugGenerator();

    @Test
    void createsUrlSafeSlugFromPortugueseName() {
        assertThat(slugGenerator.from("Barbearia do João & Filhos"))
                .isEqualTo("barbearia-do-joao-filhos");
    }

    @Test
    void fallsBackWhenNameHasNoSupportedCharacters() {
        assertThat(slugGenerator.from("---"))
                .isEqualTo("barbearia");
    }

    @Test
    void limitsSlugLength() {
        assertThat(slugGenerator.from("a".repeat(100))).hasSize(70);
    }
}
