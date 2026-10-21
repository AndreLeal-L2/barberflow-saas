package com.barberflow.config;

import com.barberflow.shared.error.BusinessRuleException;
import com.barberflow.shared.security.SecureTokenGenerator;
import jakarta.servlet.http.HttpServletRequest;
import java.sql.Timestamp;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Locale;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class RequestRateLimiter {

    private static final String CONSUME_SQL = """
            INSERT INTO request_rate_limits
                (bucket_key, capacity, refill_period_ms, tokens, last_refill_ms, expires_at)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT (bucket_key) DO UPDATE SET
                capacity = EXCLUDED.capacity,
                refill_period_ms = EXCLUDED.refill_period_ms,
                tokens = LEAST(EXCLUDED.capacity,
                    request_rate_limits.tokens
                    + GREATEST(0, EXCLUDED.last_refill_ms - request_rate_limits.last_refill_ms)
                      * (EXCLUDED.capacity::double precision / EXCLUDED.refill_period_ms)) - 1,
                last_refill_ms = EXCLUDED.last_refill_ms,
                expires_at = EXCLUDED.expires_at
            WHERE LEAST(EXCLUDED.capacity,
                request_rate_limits.tokens
                + GREATEST(0, EXCLUDED.last_refill_ms - request_rate_limits.last_refill_ms)
                  * (EXCLUDED.capacity::double precision / EXCLUDED.refill_period_ms)) >= 1
            RETURNING bucket_key
            """;

    private final Clock clock;
    private final SecureTokenGenerator tokenGenerator;
    private final JdbcTemplate jdbc;

    public RequestRateLimiter(Clock clock, SecureTokenGenerator tokenGenerator, JdbcTemplate jdbc) {
        this.clock = clock;
        this.tokenGenerator = tokenGenerator;
        this.jdbc = jdbc;
    }

    public void checkLogin(HttpServletRequest request, String email) {
        consume("login-ip", clientAddress(request), 20, Duration.ofMinutes(15));
        consume("login-account", email, 8, Duration.ofMinutes(15));
    }

    public void checkRegistration(HttpServletRequest request) {
        consume("registration-ip", clientAddress(request), 5, Duration.ofHours(1));
    }

    public void checkPublicSlots(HttpServletRequest request) {
        consume("slots-ip", clientAddress(request), 120, Duration.ofMinutes(1));
    }

    public void checkBooking(HttpServletRequest request, String customerPhone) {
        consume("booking-ip", clientAddress(request), 20, Duration.ofHours(1));
        consume("booking-phone", customerPhone, 5, Duration.ofHours(1));
    }

    public void checkPasswordRecovery(HttpServletRequest request, String email) {
        consume("password-ip", clientAddress(request), 10, Duration.ofHours(1));
        consume("password-account", email, 5, Duration.ofHours(1));
    }

    public void checkVerificationResend(HttpServletRequest request, String email) {
        consume("verification-ip", clientAddress(request), 10, Duration.ofHours(1));
        consume("verification-account", email, 3, Duration.ofHours(1));
    }

    public void checkTokenAttempt(HttpServletRequest request) {
        consume("account-token-ip", clientAddress(request), 20, Duration.ofHours(1));
    }

    @Scheduled(cron = "${app.booking.data-retention-cron}", zone = "${app.time-zone}")
    public void removeExpired() {
        jdbc.update("DELETE FROM request_rate_limits WHERE expires_at < ?",
                Timestamp.from(Instant.now(clock)));
    }

    private void consume(String action, String subject, int capacity, Duration refillPeriod) {
        String normalized = subject == null ? "unknown" : subject.trim().toLowerCase(Locale.ROOT);
        String key = action + ':' + tokenGenerator.hash(normalized);
        long now = clock.millis();
        boolean allowed = jdbc.query(
                CONSUME_SQL,
                resultSet -> resultSet.next(),
                key,
                capacity,
                refillPeriod.toMillis(),
                capacity - 1.0,
                now,
                Timestamp.from(Instant.ofEpochMilli(now).plus(refillPeriod).plus(refillPeriod))
        );
        if (!allowed) {
            throw new BusinessRuleException(
                    HttpStatus.TOO_MANY_REQUESTS,
                    "RATE_LIMIT_EXCEEDED",
                    "Foram efetuados demasiados pedidos. Tente novamente mais tarde."
            );
        }
    }

    private static String clientAddress(HttpServletRequest request) {
        return request.getRemoteAddr() == null ? "unknown" : request.getRemoteAddr();
    }
}
