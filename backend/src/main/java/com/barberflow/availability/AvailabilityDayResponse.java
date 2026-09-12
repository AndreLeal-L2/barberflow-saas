package com.barberflow.availability;

import java.time.DayOfWeek;
import java.time.LocalTime;

public record AvailabilityDayResponse(
        DayOfWeek dayOfWeek,
        LocalTime startTime,
        LocalTime endTime
) {
    public static AvailabilityDayResponse from(AvailabilityRule rule) {
        return new AvailabilityDayResponse(
                rule.getDayOfWeek(),
                rule.getStartTime(),
                rule.getEndTime()
        );
    }
}
