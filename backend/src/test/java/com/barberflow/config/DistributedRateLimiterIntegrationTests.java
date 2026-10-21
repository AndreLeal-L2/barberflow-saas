package com.barberflow.config;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.barberflow.TestcontainersConfiguration;
import com.barberflow.shared.error.BusinessRuleException;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.config.AutowireCapableBeanFactory;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.mock.web.MockHttpServletRequest;

@Import(TestcontainersConfiguration.class)
@SpringBootTest
class DistributedRateLimiterIntegrationTests {

    @Autowired private RequestRateLimiter firstInstance;
    @Autowired private AutowireCapableBeanFactory beanFactory;

    @Test
    void sharesAccountLimitsAcrossIndependentApplicationInstances() {
        RequestRateLimiter secondInstance = beanFactory.createBean(RequestRateLimiter.class);
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr("198.51.100.77");
        String account = UUID.randomUUID() + "@example.test";

        for (int attempt = 0; attempt < 8; attempt++) {
            firstInstance.checkLogin(request, account);
        }

        assertThatThrownBy(() -> secondInstance.checkLogin(request, account))
                .isInstanceOf(BusinessRuleException.class)
                .extracting("code")
                .isEqualTo("RATE_LIMIT_EXCEEDED");
    }
}
