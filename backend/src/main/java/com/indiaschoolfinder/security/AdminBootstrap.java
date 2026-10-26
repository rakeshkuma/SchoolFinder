package com.indiaschoolfinder.security;

import com.indiaschoolfinder.config.AppProperties;
import com.indiaschoolfinder.entity.AdminUser;
import com.indiaschoolfinder.enums.AdminRole;
import com.indiaschoolfinder.repository.AdminUserRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Creates the first administrator from ADMIN_BOOTSTRAP_USERNAME / ADMIN_BOOTSTRAP_PASSWORD when
 * the admin table is empty. Credentials are never hard-coded; remove the variables after first start.
 */
@Slf4j
@Component
public class AdminBootstrap implements ApplicationRunner {

    static final int MIN_PASSWORD_LENGTH = 12;

    private final AdminUserRepository repository;
    private final PasswordEncoder passwordEncoder;
    private final AppProperties properties;

    public AdminBootstrap(AdminUserRepository repository, PasswordEncoder passwordEncoder, AppProperties properties) {
        this.repository = repository;
        this.passwordEncoder = passwordEncoder;
        this.properties = properties;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (repository.count() > 0) {
            return;
        }
        String username = properties.getAdmin().getBootstrapUsername();
        String password = properties.getAdmin().getBootstrapPassword();
        if (username == null || username.isBlank() || password == null || password.isBlank()) {
            log.warn("No administrator exists. Set ADMIN_BOOTSTRAP_USERNAME and ADMIN_BOOTSTRAP_PASSWORD to create one.");
            return;
        }
        if (password.length() < MIN_PASSWORD_LENGTH) {
            throw new IllegalStateException("ADMIN_BOOTSTRAP_PASSWORD must be at least " + MIN_PASSWORD_LENGTH + " characters");
        }
        AdminUser admin = new AdminUser();
        admin.setUsername(username.trim());
        admin.setPasswordHash(passwordEncoder.encode(password));
        admin.setRole(AdminRole.ADMIN);
        repository.save(admin);
        log.info("Created bootstrap administrator '{}'. Remove ADMIN_BOOTSTRAP_PASSWORD from the environment.", admin.getUsername());
    }
}
