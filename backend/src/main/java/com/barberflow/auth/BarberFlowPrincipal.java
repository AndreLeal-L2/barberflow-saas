package com.barberflow.auth;

import com.barberflow.subscription.SubscriptionStatus;
import java.io.Serial;
import java.util.Collection;
import java.util.List;
import java.util.UUID;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

public record BarberFlowPrincipal(
        UUID userId,
        UUID barbershopId,
        String name,
        String username,
        String password,
        UserRole role,
        String barbershopName,
        String barbershopSlug,
        SubscriptionStatus subscriptionStatus,
        boolean enabled
) implements UserDetails {

    @Serial
    private static final long serialVersionUID = 1L;

    public static BarberFlowPrincipal from(AppUser user) {
        return new BarberFlowPrincipal(
                user.getId(),
                user.getBarbershop().getId(),
                user.getName(),
                user.getEmail(),
                user.getPasswordHash(),
                user.getRole(),
                user.getBarbershop().getName(),
                user.getBarbershop().getSlug(),
                user.getBarbershop().getSubscriptionStatus(),
                user.isActive() && user.getBarbershop().isActive()
        );
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority("ROLE_" + role.name()));
    }

    @Override
    public String getPassword() {
        return password;
    }

    @Override
    public String getUsername() {
        return username;
    }

    @Override
    public boolean isEnabled() {
        return enabled;
    }
}
