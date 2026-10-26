package com.indiaschoolfinder.security;

import com.indiaschoolfinder.config.AppProperties;
import com.indiaschoolfinder.enums.AdminRole;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Instant;
import java.util.Date;
import java.util.Optional;
import java.util.UUID;

/** Issues and validates short-lived HS256 access tokens. The key comes from JWT_SECRET. */
@Service
public class JwtService {

    private static final int MIN_SECRET_BYTES = 32;
    private static final String ROLE_CLAIM = "role";

    private final SecretKey key;
    private final AppProperties.Jwt config;
    private final Clock clock;

    public JwtService(AppProperties properties, Clock clock) {
        this.config = properties.getJwt();
        this.clock = clock;
        String secret = config.getSecret();
        if (secret == null || secret.getBytes(StandardCharsets.UTF_8).length < MIN_SECRET_BYTES) {
            throw new IllegalStateException("app.jwt.secret (JWT_SECRET) must be set to at least "
                    + MIN_SECRET_BYTES + " bytes of random data");
        }
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    }

    public record IssuedToken(String value, long expiresInSeconds) {
    }

    public record TokenPrincipal(String username, AdminRole role) {
    }

    public IssuedToken issue(String username, AdminRole role) {
        Instant now = clock.instant();
        Instant expiry = now.plus(config.getAccessTokenTtl());
        String token = Jwts.builder()
                .id(UUID.randomUUID().toString())
                .issuer(config.getIssuer())
                .subject(username)
                .claim(ROLE_CLAIM, role.name())
                .issuedAt(Date.from(now))
                .expiration(Date.from(expiry))
                .signWith(key, Jwts.SIG.HS256)
                .compact();
        return new IssuedToken(token, config.getAccessTokenTtl().toSeconds());
    }

    /** Empty for any invalid, expired, tampered or foreign token. */
    public Optional<TokenPrincipal> parse(String token) {
        try {
            Claims claims = Jwts.parser()
                    .verifyWith(key)
                    .requireIssuer(config.getIssuer())
                    .clock(() -> Date.from(clock.instant()))
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();
            return Optional.of(new TokenPrincipal(claims.getSubject(), AdminRole.valueOf(claims.get(ROLE_CLAIM, String.class))));
        } catch (JwtException | IllegalArgumentException e) {
            return Optional.empty();
        }
    }
}
