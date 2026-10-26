package com.indiaschoolfinder.service.impl;

import com.indiaschoolfinder.dto.auth.LoginRequest;
import com.indiaschoolfinder.dto.auth.TokenResponse;
import com.indiaschoolfinder.entity.AdminUser;
import com.indiaschoolfinder.repository.AdminUserRepository;
import com.indiaschoolfinder.security.JwtService;
import com.indiaschoolfinder.service.AuthService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Instant;

@Slf4j
@Service
public class AuthServiceImpl implements AuthService {

    private final AuthenticationManager authenticationManager;
    private final AdminUserRepository adminUserRepository;
    private final JwtService jwtService;
    private final Clock clock;

    public AuthServiceImpl(AuthenticationManager authenticationManager, AdminUserRepository adminUserRepository,
                           JwtService jwtService, Clock clock) {
        this.authenticationManager = authenticationManager;
        this.adminUserRepository = adminUserRepository;
        this.jwtService = jwtService;
        this.clock = clock;
    }

    @Override
    @Transactional
    public TokenResponse login(LoginRequest request) {
        Authentication auth = authenticationManager.authenticate(
                UsernamePasswordAuthenticationToken.unauthenticated(request.username().trim(), request.password()));
        AdminUser user = adminUserRepository.findByUsernameIgnoreCase(auth.getName())
                .orElseThrow(() -> new BadCredentialsException("Invalid username or password"));
        user.setLastLoginAt(Instant.now(clock));
        log.info("Admin login: {}", user.getUsername());
        JwtService.IssuedToken token = jwtService.issue(user.getUsername(), user.getRole());
        return new TokenResponse(token.value(), "Bearer", token.expiresInSeconds(), user.getUsername(), user.getRole());
    }
}
