package com.barberflow.availability;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;

public record AvailabilityScheduleRequest(
        @NotNull @Size(max = 7) List<@Valid AvailabilityDayRequest> days
) {
}
