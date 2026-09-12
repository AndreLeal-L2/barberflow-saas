package com.barberflow.booking;

import com.barberflow.barber.Barber;
import com.barberflow.barbershop.Barbershop;
import com.barberflow.servicecatalog.BarbershopService;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
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
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.Locale;
import java.util.UUID;

@Entity
@Table(name = "bookings")
public class Booking {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "barbershop_id", nullable = false)
    private Barbershop barbershop;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "barber_id", nullable = false)
    private Barber barber;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "service_id", nullable = false)
    private BarbershopService service;

    @Column(name = "customer_name", nullable = false, length = 120)
    private String customerName;

    @Column(name = "customer_phone", nullable = false, length = 30)
    private String customerPhone;

    @Column(name = "customer_email", length = 254)
    private String customerEmail;

    @Column(name = "start_at", nullable = false)
    private LocalDateTime startAt;

    @Column(name = "end_at", nullable = false)
    private LocalDateTime endAt;

    @Column(name = "service_name_snapshot", nullable = false, length = 120)
    private String serviceNameSnapshot;

    @Column(name = "service_duration_snapshot", nullable = false)
    private int serviceDurationSnapshot;

    @Column(name = "service_price_snapshot", nullable = false, precision = 10, scale = 2)
    private BigDecimal servicePriceSnapshot;

    @Column(name = "price_currency", nullable = false, length = 3)
    private String priceCurrency;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private BookingStatus status;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Column(name = "cancellation_token_hash", unique = true, length = 64)
    private String cancellationTokenHash;

    @Column(name = "cancellation_token_expires_at")
    private Instant cancellationTokenExpiresAt;

    @Column(name = "customer_cancelled_at")
    private Instant customerCancelledAt;

    @Column(name = "anonymized_at")
    private Instant anonymizedAt;

    protected Booking() {
    }

    private Booking(
            Barbershop barbershop,
            Barber barber,
            BarbershopService service,
            String customerName,
            String customerPhone,
            String customerEmail,
            LocalDateTime startAt,
            LocalDateTime endAt
    ) {
        this.barbershop = barbershop;
        this.barber = barber;
        this.service = service;
        this.customerName = customerName.trim();
        this.customerPhone = customerPhone.trim();
        this.customerEmail = normalizeOptional(customerEmail);
        this.startAt = startAt;
        this.endAt = endAt;
        this.serviceNameSnapshot = service.getName();
        this.serviceDurationSnapshot = service.getDurationMinutes();
        this.servicePriceSnapshot = service.getPriceAmount();
        this.priceCurrency = service.getPriceCurrency();
        this.status = BookingStatus.CONFIRMED;
    }

    public static Booking create(
            Barbershop barbershop,
            Barber barber,
            BarbershopService service,
            String customerName,
            String customerPhone,
            String customerEmail,
            LocalDateTime startAt,
            LocalDateTime endAt
    ) {
        return new Booking(
                barbershop,
                barber,
                service,
                customerName,
                customerPhone,
                customerEmail,
                startAt,
                endAt
        );
    }

    public void changeStatus(BookingStatus newStatus) {
        status = newStatus;
        if (newStatus != BookingStatus.CONFIRMED) {
            cancellationTokenHash = null;
            cancellationTokenExpiresAt = null;
        }
    }

    public void enableCustomerCancellation(String tokenHash, Instant expiresAt) {
        cancellationTokenHash = tokenHash;
        cancellationTokenExpiresAt = expiresAt;
    }

    public void cancelByCustomer(Instant now) {
        status = BookingStatus.CANCELLED;
        customerCancelledAt = now;
        cancellationTokenHash = null;
        cancellationTokenExpiresAt = null;
    }

    public void anonymize(Instant now) {
        customerName = "Cliente removido";
        customerPhone = "removido";
        customerEmail = null;
        cancellationTokenHash = null;
        cancellationTokenExpiresAt = null;
        anonymizedAt = now;
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
        return value == null || value.isBlank()
                ? null
                : value.trim().toLowerCase(Locale.ROOT);
    }

    public UUID getId() {
        return id;
    }

    public Barbershop getBarbershop() {
        return barbershop;
    }

    public String getCustomerName() {
        return customerName;
    }

    public String getCustomerPhone() {
        return customerPhone;
    }

    public String getCustomerEmail() {
        return customerEmail;
    }

    public LocalDateTime getStartAt() {
        return startAt;
    }

    public LocalDateTime getEndAt() {
        return endAt;
    }

    public String getServiceNameSnapshot() {
        return serviceNameSnapshot;
    }

    public int getServiceDurationSnapshot() {
        return serviceDurationSnapshot;
    }

    public BigDecimal getServicePriceSnapshot() {
        return servicePriceSnapshot;
    }

    public String getPriceCurrency() {
        return priceCurrency;
    }

    public BookingStatus getStatus() {
        return status;
    }

    public Instant getCancellationTokenExpiresAt() {
        return cancellationTokenExpiresAt;
    }
}
