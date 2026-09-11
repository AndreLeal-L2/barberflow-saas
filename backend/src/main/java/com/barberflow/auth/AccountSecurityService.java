package com.barberflow.auth;

import com.barberflow.notification.NotificationOutboxService;
import java.time.Duration;
import java.util.Locale;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AccountSecurityService {

    private static final Duration VERIFICATION_LIFETIME = Duration.ofHours(24);
    private static final Duration RESET_LIFETIME = Duration.ofMinutes(30);

    private final AppUserRepository userRepository;
    private final AccountActionTokenService tokenService;
    private final NotificationOutboxService notificationService;
    private final PasswordEncoder passwordEncoder;
    private final JdbcTemplate jdbcTemplate;
    private final String publicBaseUrl;

    public AccountSecurityService(
            AppUserRepository userRepository,
            AccountActionTokenService tokenService,
            NotificationOutboxService notificationService,
            PasswordEncoder passwordEncoder,
            JdbcTemplate jdbcTemplate,
            @Value("${app.public-base-url}") String publicBaseUrl
    ) {
        this.userRepository = userRepository;
        this.tokenService = tokenService;
        this.notificationService = notificationService;
        this.passwordEncoder = passwordEncoder;
        this.jdbcTemplate = jdbcTemplate;
        this.publicBaseUrl = publicBaseUrl.replaceAll("/+$", "");
    }

    @Transactional
    public void sendVerification(UUID userId) {
        AppUser user = userRepository.findById(userId).orElseThrow();
        if (user.isEmailVerified()) {
            return;
        }
        String token = tokenService.issue(
                user,
                AccountTokenPurpose.VERIFY_EMAIL,
                VERIFICATION_LIFETIME
        );
        String link = publicBaseUrl + "/verify-email?token=" + token;
        notificationService.enqueue(
                "VERIFY_EMAIL",
                user.getEmail(),
                "Confirme o seu email no BarberFlow",
                "Olá " + user.getName() + ",\n\nConfirme o seu email através deste link:\n"
                        + link + "\n\nO link é válido durante 24 horas."
        );
    }

    @Transactional
    public void verifyEmail(String rawToken) {
        tokenService.consume(rawToken, AccountTokenPurpose.VERIFY_EMAIL).verifyEmail();
    }

    @Transactional
    public void requestPasswordReset(String email) {
        userRepository.findByEmailIgnoreCase(normalizeEmail(email)).ifPresent(user -> {
            String token = tokenService.issue(
                    user,
                    AccountTokenPurpose.RESET_PASSWORD,
                    RESET_LIFETIME
            );
            String link = publicBaseUrl + "/reset-password?token=" + token;
            notificationService.enqueue(
                    "RESET_PASSWORD",
                    user.getEmail(),
                    "Recuperar palavra-passe do BarberFlow",
                    "Olá " + user.getName() + ",\n\nDefina uma nova palavra-passe através deste link:\n"
                            + link + "\n\nO link é válido durante 30 minutos."
            );
        });
    }

    @Transactional
    public void resetPassword(String rawToken, String password) {
        AppUser user = tokenService.consume(rawToken, AccountTokenPurpose.RESET_PASSWORD);
        user.changePassword(passwordEncoder.encode(password));
        jdbcTemplate.update("DELETE FROM spring_session WHERE principal_name = ?", user.getEmail());
    }

    private static String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }
}
