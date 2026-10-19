package com.barberflow.availability;

import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.UUID;

public record BlockedTimeResponse(
        UUID id,
        UUID barberId,
        String barberName,
        LocalDateTime startAt,
        LocalDateTime endAt,
        String reason,
        boolean fullDay
) {
    public static BlockedTimeResponse from(BlockedTime blockedTime) {
        boolean fullDay = blockedTime.getStartAt().toLocalTime().equals(LocalTime.MIDNIGHT)
                && blockedTime.getEndAt().toLocalTime().equals(LocalTime.MIDNIGHT)
                && blockedTime.getEndAt().toLocalDate()
                        .isAfter(blockedTime.getStartAt().toLocalDate());
        return new BlockedTimeResponse(
                blockedTime.getId(),
                blockedTime.getBarber().getId(),
                blockedTime.getBarber().getName(),
                blockedTime.getStartAt(),
                blockedTime.getEndAt(),
                blockedTime.getReason(),
                fullDay
        );
    }
}
