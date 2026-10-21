package com.barberflow.booking;

import static org.assertj.core.api.Assertions.assertThat;

import jakarta.validation.Validation;
import jakarta.validation.Validator;
import java.time.LocalDateTime;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class CreateBookingRequestValidationTest {

    private final Validator validator = Validation.buildDefaultValidatorFactory().getValidator();

    @Test
    void rejectsControlCharactersAndMalformedCustomerPhoneNumbers() {
        CreateBookingRequest request = new CreateBookingRequest(
                UUID.randomUUID(),
                LocalDateTime.parse("2026-11-02T10:00:00"),
                "Alice\nInjected log line",
                "call me maybe",
                "alice@example.test"
        );

        assertThat(validator.validate(request))
                .extracting(violation -> violation.getPropertyPath().toString())
                .contains("customerName", "customerPhone");
    }
}
