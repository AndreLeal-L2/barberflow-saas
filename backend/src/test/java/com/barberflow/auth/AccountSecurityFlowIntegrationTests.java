package com.barberflow.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.barberflow.TestcontainersConfiguration;
import com.barberflow.notification.NotificationOutbox;
import com.barberflow.notification.NotificationOutboxRepository;
import jakarta.servlet.http.Cookie;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

@Import(TestcontainersConfiguration.class)
@SpringBootTest
@AutoConfigureMockMvc
class AccountSecurityFlowIntegrationTests {

    private static final Pattern LINK_TOKEN = Pattern.compile("token=([A-Za-z0-9_-]+)");

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private NotificationOutboxRepository notificationRepository;

    @Test
    void shouldVerifyEmailAndResetPasswordWithOneTimeTokens() throws Exception {
        String email = "account-security@example.test";
        Cookie csrfCookie = csrfCookie();

        MvcResult registration = mockMvc.perform(post("/api/auth/register")
                        .cookie(csrfCookie)
                        .header("X-XSRF-TOKEN", csrfCookie.getValue())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "ownerName": "Rita Segurança",
                                  "barbershopName": "Barbearia Conta Segura",
                                  "email": "%s",
                                  "phone": "+351 910 000 003",
                                  "password": "PalavraPasseAntiga2026!"
                                }
                                """.formatted(email)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.emailVerified").value(false))
                .andReturn();
        Cookie sessionCookie = registration.getResponse().getCookie("BARBERFLOW_SESSION");
        assertThat(sessionCookie).isNotNull();

        String verificationToken = tokenFromNotification("VERIFY_EMAIL", email);
        mockMvc.perform(post("/api/auth/verification/confirm")
                        .cookie(csrfCookie)
                        .header("X-XSRF-TOKEN", csrfCookie.getValue())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(tokenBody(verificationToken)))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/auth/me").cookie(sessionCookie))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.emailVerified").value(true));

        mockMvc.perform(post("/api/auth/verification/confirm")
                        .cookie(csrfCookie)
                        .header("X-XSRF-TOKEN", csrfCookie.getValue())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(tokenBody(verificationToken)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("ACCOUNT_TOKEN_INVALID"));

        mockMvc.perform(post("/api/auth/password/forgot")
                        .cookie(csrfCookie)
                        .header("X-XSRF-TOKEN", csrfCookie.getValue())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"%s\"}".formatted(email)))
                .andExpect(status().isAccepted());

        String resetToken = tokenFromNotification("RESET_PASSWORD", email);
        mockMvc.perform(post("/api/auth/password/reset")
                        .cookie(csrfCookie)
                        .header("X-XSRF-TOKEN", csrfCookie.getValue())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "token": "%s",
                                  "password": "PalavraPasseNova2026!"
                                }
                                """.formatted(resetToken)))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/auth/login")
                        .cookie(csrfCookie)
                        .header("X-XSRF-TOKEN", csrfCookie.getValue())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginBody(email, "PalavraPasseAntiga2026!")))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("INVALID_CREDENTIALS"));

        mockMvc.perform(post("/api/auth/login")
                        .cookie(csrfCookie)
                        .header("X-XSRF-TOKEN", csrfCookie.getValue())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginBody(email, "PalavraPasseNova2026!")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.emailVerified").value(true));

        mockMvc.perform(post("/api/auth/password/reset")
                        .cookie(csrfCookie)
                        .header("X-XSRF-TOKEN", csrfCookie.getValue())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"token":"%s","password":"OutraPalavraPasse2026!"}
                                """.formatted(resetToken)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("ACCOUNT_TOKEN_INVALID"));
    }

    private Cookie csrfCookie() throws Exception {
        MvcResult result = mockMvc.perform(get("/api/auth/csrf"))
                .andExpect(status().isOk())
                .andReturn();
        Cookie cookie = result.getResponse().getCookie("XSRF-TOKEN");
        assertThat(cookie).isNotNull();
        return cookie;
    }

    private String tokenFromNotification(String type, String recipient) {
        NotificationOutbox notification = notificationRepository
                .findFirstByNotificationTypeAndRecipientOrderByCreatedAtDesc(type, recipient)
                .orElseThrow();
        Matcher matcher = LINK_TOKEN.matcher(notification.getBody());
        assertThat(matcher.find()).isTrue();
        return matcher.group(1);
    }

    private static String tokenBody(String token) {
        return "{\"token\":\"%s\"}".formatted(token);
    }

    private static String loginBody(String email, String password) {
        return "{\"email\":\"%s\",\"password\":\"%s\"}".formatted(email, password);
    }
}
