package com.barberflow.config;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.barberflow.shared.error.BusinessRuleException;
import com.barberflow.TestcontainersConfiguration;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.mock.web.MockHttpServletRequest;

@Import(TestcontainersConfiguration.class)
@SpringBootTest
class RequestRateLimiterTest {

    @Autowired private RequestRateLimiter limiter;

    @Test
    void shouldLimitRepeatedLoginAttemptsForTheSameAccount() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr("203.0.113.10");
        String account = UUID.randomUUID() + "@example.test";

        for (int attempt = 0; attempt < 8; attempt++) {
            limiter.checkLogin(request, account);
        }

        assertThatThrownBy(() -> limiter.checkLogin(request, account.toUpperCase()))
                .isInstanceOf(BusinessRuleException.class)
                .extracting("code")
                .isEqualTo("RATE_LIMIT_EXCEEDED");
    }
}
