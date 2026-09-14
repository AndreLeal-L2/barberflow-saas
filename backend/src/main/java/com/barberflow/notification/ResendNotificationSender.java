package com.barberflow.notification;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.locks.ReentrantLock;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

@Component
@ConditionalOnProperty(name = "app.mail.delivery", havingValue = "resend")
public class ResendNotificationSender implements NotificationSender {

    private static final Duration SCHEDULING_HORIZON = Duration.ofDays(29);
    private static final Duration IMMEDIATE_DELIVERY_WINDOW = Duration.ofMinutes(1);
    private static final Duration MIN_REQUEST_INTERVAL = Duration.ofMillis(250);
    private static final Duration CONNECT_TIMEOUT = Duration.ofSeconds(3);
    private static final Duration READ_TIMEOUT = Duration.ofSeconds(10);

    private final RestClient restClient;
    private final Clock clock;
    private final String from;
    private final ReentrantLock requestLock = new ReentrantLock();
    private long nextRequestAtNanos;

    @Autowired
    public ResendNotificationSender(
            @Value("${app.mail.resend.api-key}") String apiKey,
            @Value("${app.mail.resend.base-url:https://api.resend.com}") String baseUrl,
            @Value("${app.mail.from}") String from,
            Clock clock
    ) {
        if (apiKey == null || apiKey.isBlank()) {
            throw new IllegalStateException(
                    "RESEND_API_KEY é obrigatória quando o envio Resend está ativo."
            );
        }
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(CONNECT_TIMEOUT);
        requestFactory.setReadTimeout(READ_TIMEOUT);
        this.restClient = RestClient.builder()
                .baseUrl(baseUrl)
                .requestFactory(requestFactory)
                .defaultHeader(HttpHeaders.AUTHORIZATION, "Bearer " + apiKey)
                .defaultHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                .defaultHeader(HttpHeaders.USER_AGENT, "BarberFlow/1.0")
                .build();
        this.clock = clock;
        this.from = from;
    }

    ResendNotificationSender(RestClient restClient, Clock clock, String from) {
        this.restClient = restClient;
        this.clock = clock;
        this.from = from;
    }

    @Override
    public NotificationSendResult send(NotificationOutbox notification) {
        awaitRequestSlot();
        Instant now = Instant.now(clock);
        boolean scheduled = notification.getScheduledFor()
                .isAfter(now.plus(IMMEDIATE_DELIVERY_WINDOW));
        ResendEmailResponse response = restClient.post()
                .uri("/emails")
                .header("Idempotency-Key", notification.getId().toString())
                .body(new ResendEmailRequest(
                        from,
                        List.of(notification.getRecipient()),
                        notification.getSubject(),
                        notification.getBody(),
                        scheduled ? notification.getScheduledFor().toString() : null
                ))
                .retrieve()
                .body(ResendEmailResponse.class);

        if (response == null || response.id() == null || response.id().isBlank()) {
            throw new IllegalStateException("A Resend não devolveu o ID da mensagem.");
        }
        return scheduled
                ? NotificationSendResult.scheduled(response.id())
                : NotificationSendResult.sent(response.id());
    }

    @Override
    public void cancel(String providerMessageId) {
        if (providerMessageId == null || providerMessageId.isBlank()) {
            throw new IllegalArgumentException("A mensagem agendada não tem ID externo.");
        }
        awaitRequestSlot();
        restClient.post()
                .uri("/emails/{emailId}/cancel", providerMessageId)
                .retrieve()
                .toBodilessEntity();
    }

    @Override
    public Duration schedulingHorizon() {
        return SCHEDULING_HORIZON;
    }

    private void awaitRequestSlot() {
        requestLock.lock();
        try {
            long waitNanos = nextRequestAtNanos - System.nanoTime();
            if (waitNanos > 0) {
                TimeUnit.NANOSECONDS.sleep(waitNanos);
            }
            nextRequestAtNanos = System.nanoTime() + MIN_REQUEST_INTERVAL.toNanos();
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Envio de email interrompido.", exception);
        } finally {
            requestLock.unlock();
        }
    }

    @JsonInclude(JsonInclude.Include.NON_NULL)
    private record ResendEmailRequest(
            String from,
            List<String> to,
            String subject,
            String text,
            @JsonProperty("scheduled_at") String scheduledAt
    ) {
    }

    private record ResendEmailResponse(String id) {
    }
}
