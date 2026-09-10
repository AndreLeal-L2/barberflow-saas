package com.barberflow.subscription;

public enum SubscriptionStatus {
    TRIALING,
    ACTIVE,
    PAST_DUE,
    CANCELLED;

    public boolean grantsBookingAccess() {
        return this == TRIALING || this == ACTIVE;
    }
}
