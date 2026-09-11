package com.barberflow.availability;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDateTime;

public record CreateBlockedTimeRequest(
        @NotNull LocalDateTime startAt,
        @NotNull LocalDateTime endAt,
        @Size(max = 255) String reason
) {
}
