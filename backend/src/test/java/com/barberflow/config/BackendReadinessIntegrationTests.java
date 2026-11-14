package com.barberflow.config;

import static org.assertj.core.api.Assertions.assertThat;
import com.barberflow.TestcontainersConfiguration;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.Arrays;
import java.util.HashSet;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;

@Import(TestcontainersConfiguration.class)
@ActiveProfiles("vercel")
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class BackendReadinessIntegrationTests {
    @Autowired ConfigurableApplicationContext context;
    @LocalServerPort int port;

    @Test
    void firstLoginPreparationDoesNotInitializeControllersAfterReadiness() throws Exception {
        var before = new HashSet<>(Arrays.asList(context.getBeanFactory().getSingletonNames()));
        var response = HttpClient.newHttpClient().send(HttpRequest.newBuilder(
                URI.create("http://127.0.0.1:" + port + "/api/auth/csrf")).build(), HttpResponse.BodyHandlers.ofString());
        assertThat(response.statusCode()).isEqualTo(200);
        var initializedDuringRequest = new HashSet<>(Arrays.asList(context.getBeanFactory().getSingletonNames()));
        initializedDuringRequest.removeAll(before);
        assertThat(initializedDuringRequest).noneMatch(name -> name.endsWith("Controller"));
    }
}
