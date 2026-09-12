package com.barberflow.availability;

import com.barberflow.barber.Barber;
import com.barberflow.barbershop.Barbershop;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "blocked_times")
public class BlockedTime {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "barbershop_id", nullable = false)
    private Barbershop barbershop;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "barber_id", nullable = false)
    private Barber barber;

    @Column(name = "start_at", nullable = false)
    private LocalDateTime startAt;

    @Column(name = "end_at", nullable = false)
    private LocalDateTime endAt;

    @Column(length = 255)
    private String reason;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected BlockedTime() {
    }

    private BlockedTime(
            Barbershop barbershop,
            Barber barber,
            LocalDateTime startAt,
            LocalDateTime endAt,
            String reason
    ) {
        this.barbershop = barbershop;
        this.barber = barber;
        this.startAt = startAt;
        this.endAt = endAt;
        this.reason = normalizeOptional(reason);
    }

    public static BlockedTime create(
            Barbershop barbershop,
            Barber barber,
            LocalDateTime startAt,
            LocalDateTime endAt,
            String reason
    ) {
        return new BlockedTime(barbershop, barber, startAt, endAt, reason);
    }

    @PrePersist
    void onCreate() {
        createdAt = Instant.now();
    }

    private static String normalizeOptional(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    public UUID getId() {
        return id;
    }

    public LocalDateTime getStartAt() {
        return startAt;
    }

    public LocalDateTime getEndAt() {
        return endAt;
    }

    public String getReason() {
        return reason;
    }
}
