package com.barberflow.notification;

import com.fasterxml.jackson.annotation.JsonInclude;
import jakarta.mail.internet.AddressException;
import jakarta.mail.internet.InternetAddress;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
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
@ConditionalOnProperty(name = "app.mail.delivery", havingValue = "brevo")
public class BrevoNotificationSender implements NotificationSender {

    private static final Duration SCHEDULING_HORIZON = Duration.ofHours(71);
    private static final Duration IMMEDIATE_DELIVERY_WINDOW = Duration.ofMinutes(1);
    private static final Duration MIN_REQUEST_INTERVAL = Duration.ofMillis(650);
    private static final Duration CONNECT_TIMEOUT = Duration.ofSeconds(3);
    private static final Duration READ_TIMEOUT = Duration.ofSeconds(10);

    private final RestClient restClient;
    private final Clock clock;
    private final BrevoSender sender;
    private final ReentrantLock requestLock = new ReentrantLock();
    private long nextRequestAtNanos;

    @Autowired
    public BrevoNotificationSender(
            @Value("${app.mail.brevo.api-key}") String apiKey,
            @Value("${app.mail.brevo.base-url:https://api.brevo.com/v3}") String baseUrl,
            @Value("${app.mail.from}") String from,
            Clock clock
    ) {
        if (apiKey == null || apiKey.isBlank()) {
            throw new IllegalStateException(
                    "BREVO_API_KEY é obrigatória quando o envio Brevo está ativo."
            );
        }
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(CONNECT_TIMEOUT);
        requestFactory.setReadTimeout(READ_TIMEOUT);
        this.restClient = RestClient.builder()
                .baseUrl(baseUrl)
                .requestFactory(requestFactory)
                .defaultHeader("api-key", apiKey)
                .defaultHeader(HttpHeaders.ACCEPT, MediaType.APPLICATION_JSON_VALUE)
                .defaultHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                .defaultHeader(HttpHeaders.USER_AGENT, "BarberFlow/1.0")
                .build();
        this.clock = clock;
        this.sender = parseSender(from);
    }

    BrevoNotificationSender(RestClient restClient, Clock clock, String from) {
        this.restClient = restClient;
        this.clock = clock;
        this.sender = parseSender(from);
    }

    @Override
    public NotificationSendResult send(NotificationOutbox notification) {
        awaitRequestSlot();
        Instant now = Instant.now(clock);
        boolean scheduled = notification.getScheduledFor()
                .isAfter(now.plus(IMMEDIATE_DELIVERY_WINDOW));
        BrevoEmailResponse response = restClient.post()
                .uri("/smtp/email")
                .body(new BrevoEmailRequest(
                        sender,
                        List.of(new BrevoRecipient(notification.getRecipient())),
                        notification.getSubject(),
                        notification.getBody(),
                        scheduled ? notification.getScheduledFor().toString() : null,
                        Map.of("idempotencyKey", notification.getId().toString())
                ))
                .retrieve()
                .body(BrevoEmailResponse.class);

        if (response == null || response.messageId() == null || response.messageId().isBlank()) {
            throw new IllegalStateException("A Brevo não devolveu o ID da mensagem.");
        }
        return scheduled
                ? NotificationSendResult.scheduled(response.messageId())
                : NotificationSendResult.sent(response.messageId());
    }

    @Override
    public void cancel(String providerMessageId) {
        if (providerMessageId == null || providerMessageId.isBlank()) {
            throw new IllegalArgumentException("A mensagem agendada não tem ID externo.");
        }
        awaitRequestSlot();
        restClient.delete()
                .uri("/smtp/email/{messageId}", providerMessageId)
                .retrieve()
                .toBodilessEntity();
    }

    @Override
    public Duration schedulingHorizon() {
        return SCHEDULING_HORIZON;
    }

    private static BrevoSender parseSender(String from) {
        try {
            InternetAddress[] addresses = InternetAddress.parse(from, true);
            if (addresses.length != 1) {
                throw new IllegalArgumentException(
                        "BARBERFLOW_MAIL_FROM deve conter apenas um remetente."
                );
            }
            InternetAddress address = addresses[0];
            String name = address.getPersonal();
            return new BrevoSender(
                    address.getAddress(),
                    name == null || name.isBlank() ? "BarberFlow" : name
            );
        } catch (AddressException | NullPointerException exception) {
            throw new IllegalArgumentException(
                    "BARBERFLOW_MAIL_FROM não contém um remetente válido.",
                    exception
            );
        }
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

    private record BrevoSender(String email, String name) {
    }

    private record BrevoRecipient(String email) {
    }

    @JsonInclude(JsonInclude.Include.NON_NULL)
    private record BrevoEmailRequest(
            BrevoSender sender,
            List<BrevoRecipient> to,
            String subject,
            String textContent,
            String scheduledAt,
            Map<String, String> headers
    ) {
    }

    private record BrevoEmailResponse(String messageId) {
    }
}
