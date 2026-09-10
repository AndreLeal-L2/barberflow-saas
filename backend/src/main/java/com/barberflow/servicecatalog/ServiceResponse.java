package com.barberflow.servicecatalog;

import java.math.BigDecimal;
import java.util.UUID;

public record ServiceResponse(
        UUID id,
        String name,
        String description,
        int durationMinutes,
        BigDecimal priceAmount,
        String priceCurrency
) {
    public static ServiceResponse from(BarbershopService service) {
        return new ServiceResponse(
                service.getId(),
                service.getName(),
                service.getDescription(),
                service.getDurationMinutes(),
                service.getPriceAmount(),
                service.getPriceCurrency()
        );
    }
}
