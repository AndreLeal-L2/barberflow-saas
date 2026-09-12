package com.barberflow.booking;

import java.time.LocalDateTime;

public record SlotResponse(LocalDateTime startAt, LocalDateTime endAt) {
}
