package com.barberflow.barbershop;

import com.barberflow.subscription.SubscriptionStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "barbershops")
public class Barbershop {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, length = 120)
    private String name;

    @Column(nullable = false, unique = true, length = 80)
    private String slug;

    @Column(nullable = false, length = 30)
    private String phone;

    @Column(nullable = false, length = 254)
    private String email;

    @Column(name = "public_description", length = 500)
    private String publicDescription;

    @Column(name = "public_address", length = 255)
    private String publicAddress;

    @Column(nullable = false)
    private boolean active;

    @Column(nullable = false)
    private boolean published;

    @Enumerated(EnumType.STRING)
    @Column(name = "subscription_status", nullable = false, length = 20)
    private SubscriptionStatus subscriptionStatus;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected Barbershop() {
    }

    private Barbershop(String name, String slug, String phone, String email) {
        this.name = name;
        this.slug = slug;
        this.phone = phone;
        this.email = email;
        this.active = true;
        this.published = false;
        this.subscriptionStatus = SubscriptionStatus.TRIALING;
    }

    public static Barbershop create(String name, String slug, String phone, String email) {
        return new Barbershop(name, slug, phone, email);
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

    public UUID getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public String getSlug() {
        return slug;
    }

    public String getPhone() {
        return phone;
    }

    public String getEmail() {
        return email;
    }

    public String getPublicDescription() {
        return publicDescription;
    }

    public String getPublicAddress() {
        return publicAddress;
    }

    public boolean isActive() {
        return active;
    }

    public boolean isPublished() {
        return published;
    }

    public SubscriptionStatus getSubscriptionStatus() {
        return subscriptionStatus;
    }

    public void updatePublicProfile(String publicDescription, String publicAddress) {
        this.publicDescription = publicDescription;
        this.publicAddress = publicAddress;
    }

    public void setPublished(boolean published) {
        this.published = published;
    }
}
