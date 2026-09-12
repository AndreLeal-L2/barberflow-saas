package com.barberflow.config;

import com.barberflow.shared.error.BusinessRuleException;
import com.barberflow.shared.security.SecureTokenGenerator;
import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import jakarta.servlet.http.HttpServletRequest;
import java.time.Clock;
import java.time.Duration;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

@Component
public class RequestRateLimiter {

    private static final int MAX_TRACKED_SUBJECTS = 100_000;

    private final Cache<String, TokenBucket> buckets = Caffeine.newBuilder()
            .maximumSize(MAX_TRACKED_SUBJECTS)
            .expireAfterAccess(Duration.ofHours(2))
            .build();
    private final Clock clock;
    private final SecureTokenGenerator tokenGenerator;

    public RequestRateLimiter(Clock clock, SecureTokenGenerator tokenGenerator) {
        this.clock = clock;
        this.tokenGenerator = tokenGenerator;
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

    private void consume(String action, String subject, int capacity, Duration refillPeriod) {
        String normalized = subject == null ? "unknown" : subject.trim().toLowerCase();
        String key = action + ':' + tokenGenerator.hash(normalized);
        TokenBucket bucket = buckets.get(
                key,
                ignored -> new TokenBucket(capacity, refillPeriod, clock.millis())
        );
        if (!bucket.tryConsume(clock.millis())) {
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

    private static final class TokenBucket {

        private final int capacity;
        private final double tokensPerMillisecond;
        private double tokens;
        private long lastRefillAt;

        private TokenBucket(int capacity, Duration refillPeriod, long createdAt) {
            this.capacity = capacity;
            this.tokens = capacity;
            this.tokensPerMillisecond = (double) capacity / refillPeriod.toMillis();
            this.lastRefillAt = createdAt;
        }

        private synchronized boolean tryConsume(long now) {
            long elapsed = Math.max(0, now - lastRefillAt);
            tokens = Math.min(capacity, tokens + elapsed * tokensPerMillisecond);
            lastRefillAt = now;
            if (tokens < 1) {
                return false;
            }
            tokens--;
            return true;
        }
    }
}
