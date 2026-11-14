package com.barberflow.auth;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.barberflow.notification.NotificationOutboxService;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;

class AccountSecurityBrandTest {
    @Test
    void accountMessagesUseCurrentBrandAndRetainActionLinks() {
        AppUserRepository users = mock(AppUserRepository.class);
        AccountActionTokenService tokens = mock(AccountActionTokenService.class);
        NotificationOutboxService outbox = mock(NotificationOutboxService.class);
        AppUser user = mock(AppUser.class);
        UUID userId = UUID.randomUUID();
        when(users.findById(userId)).thenReturn(Optional.of(user));
        when(users.findByEmailIgnoreCase("owner@example.test")).thenReturn(Optional.of(user));
        when(user.getEmail()).thenReturn("owner@example.test");
        when(user.getName()).thenReturn("Profissional exemplo");
        when(tokens.issue(eq(user), any(), any())).thenReturn("test-token");
        AccountSecurityService service = new AccountSecurityService(users, tokens, outbox,
                mock(PasswordEncoder.class), mock(JdbcTemplate.class), "http://127.0.0.1:4200");
        service.sendVerification(userId);
        service.requestPasswordReset("owner@example.test");
        verify(outbox).enqueue(eq("VERIFY_EMAIL"), eq("owner@example.test"),
                eq("Confirme o seu email no Compasso"), org.mockito.ArgumentMatchers.contains("/verify-email?token=test-token"));
        verify(outbox).enqueue(eq("RESET_PASSWORD"), eq("owner@example.test"),
                eq("Recuperar palavra-passe do Compasso"), org.mockito.ArgumentMatchers.contains("/reset-password?token=test-token"));
    }
}
