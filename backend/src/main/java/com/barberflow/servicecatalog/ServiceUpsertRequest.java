package com.barberflow.servicecatalog;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;

public record ServiceUpsertRequest(
        @NotBlank @Size(max = 120) String name,
        @Size(max = 500) String description,
        @Min(15) @Max(480) int durationMinutes,
        @NotNull @DecimalMin("0.00") BigDecimal priceAmount
) {
}
