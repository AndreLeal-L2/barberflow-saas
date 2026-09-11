package com.barberflow.config;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.barberflow.shared.error.BusinessRuleException;
import com.barberflow.shared.security.SecureTokenGenerator;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;

class RequestRateLimiterTest {

    @Test
    void shouldLimitRepeatedLoginAttemptsForTheSameAccount() {
        RequestRateLimiter limiter = new RequestRateLimiter(
                Clock.fixed(Instant.parse("2026-09-11T00:00:00Z"), ZoneOffset.UTC),
                new SecureTokenGenerator()
        );
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr("203.0.113.10");

        for (int attempt = 0; attempt < 8; attempt++) {
            limiter.checkLogin(request, "owner@example.test");
        }

        assertThatThrownBy(() -> limiter.checkLogin(request, "OWNER@example.test"))
                .isInstanceOf(BusinessRuleException.class)
                .extracting("code")
                .isEqualTo("RATE_LIMIT_EXCEEDED");
    }
}
