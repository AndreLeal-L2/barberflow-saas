package com.barberflow.auth;

import jakarta.persistence.LockModeType;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AccountActionTokenRepository
        extends JpaRepository<AccountActionToken, UUID> {

    void deleteAllByUserIdAndPurposeAndConsumedAtIsNull(
            UUID userId,
            AccountTokenPurpose purpose
    );

    void deleteAllByExpiresAtBefore(Instant expiresAt);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            select token
            from AccountActionToken token
            join fetch token.user
            where token.tokenHash = :tokenHash
              and token.purpose = :purpose
              and token.consumedAt is null
            """)
    Optional<AccountActionToken> findUsableForUpdate(
            @Param("tokenHash") String tokenHash,
            @Param("purpose") AccountTokenPurpose purpose
    );
}
