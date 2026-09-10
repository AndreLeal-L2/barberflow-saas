package com.barberflow.servicecatalog;

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
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "barbershop_services")
public class BarbershopService {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "barbershop_id", nullable = false)
    private Barbershop barbershop;

    @Column(nullable = false, length = 120)
    private String name;

    @Column(length = 500)
    private String description;

    @Column(name = "duration_minutes", nullable = false)
    private int durationMinutes;

    @Column(name = "price_amount", nullable = false, precision = 10, scale = 2)
    private BigDecimal priceAmount;

    @Column(name = "price_currency", nullable = false, length = 3)
    private String priceCurrency;

    @Column(nullable = false)
    private boolean active;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected BarbershopService() {
    }

    private BarbershopService(
            Barbershop barbershop,
            String name,
            String description,
            int durationMinutes,
            BigDecimal priceAmount
    ) {
        this.barbershop = barbershop;
        update(name, description, durationMinutes, priceAmount);
        this.priceCurrency = "EUR";
        this.active = true;
    }

    public static BarbershopService create(
            Barbershop barbershop,
            String name,
            String description,
            int durationMinutes,
            BigDecimal priceAmount
    ) {
        return new BarbershopService(
                barbershop,
                name,
                description,
                durationMinutes,
                priceAmount
        );
    }

    public void update(
            String name,
            String description,
            int durationMinutes,
            BigDecimal priceAmount
    ) {
        this.name = name.trim();
        this.description = normalizeOptional(description);
        this.durationMinutes = durationMinutes;
        this.priceAmount = priceAmount.setScale(2, RoundingMode.HALF_UP);
    }

    public void deactivate() {
        active = false;
    }

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }

    private static String normalizeOptional(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }

    public UUID getId() {
        return id;
    }

    public Barbershop getBarbershop() {
        return barbershop;
    }

    public String getName() {
        return name;
    }

    public String getDescription() {
        return description;
    }

    public int getDurationMinutes() {
        return durationMinutes;
    }

    public BigDecimal getPriceAmount() {
        return priceAmount;
    }

    public String getPriceCurrency() {
        return priceCurrency;
    }
}
