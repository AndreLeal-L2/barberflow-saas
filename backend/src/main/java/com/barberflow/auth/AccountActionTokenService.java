package com.barberflow.auth;

import com.barberflow.shared.error.BusinessRuleException;
import com.barberflow.shared.security.SecureTokenGenerator;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

@Service
public class AccountActionTokenService {

    private final AccountActionTokenRepository repository;
    private final SecureTokenGenerator tokenGenerator;
    private final Clock clock;

    public AccountActionTokenService(
            AccountActionTokenRepository repository,
            SecureTokenGenerator tokenGenerator,
            Clock clock
    ) {
        this.repository = repository;
        this.tokenGenerator = tokenGenerator;
        this.clock = clock;
    }

    public String issue(AppUser user, AccountTokenPurpose purpose, Duration lifetime) {
        repository.deleteAllByUserIdAndPurposeAndConsumedAtIsNull(user.getId(), purpose);

        String rawToken = tokenGenerator.generate();
        Instant now = Instant.now(clock);
        repository.save(AccountActionToken.create(
                user,
                purpose,
                tokenGenerator.hash(rawToken),
                now.plus(lifetime),
                now
        ));
        return rawToken;
    }

    public AppUser consume(String rawToken, AccountTokenPurpose purpose) {
        Instant now = Instant.now(clock);
        AccountActionToken token = repository
                .findUsableForUpdate(tokenGenerator.hash(rawToken), purpose)
                .orElseThrow(AccountActionTokenService::invalidToken);
        if (!token.getExpiresAt().isAfter(now)) {
            throw invalidToken();
        }
        token.consume(now);
        return token.getUser();
    }

    private static BusinessRuleException invalidToken() {
        return new BusinessRuleException(
                HttpStatus.BAD_REQUEST,
                "ACCOUNT_TOKEN_INVALID",
                "Este link é inválido ou já expirou."
        );
    }
}
