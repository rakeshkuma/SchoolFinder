package com.indiaschoolfinder;

import com.indiaschoolfinder.entity.AdminUser;
import com.indiaschoolfinder.enums.AdminRole;
import com.indiaschoolfinder.repository.AdminUserRepository;
import org.springframework.boot.WebApplicationType;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.security.SecureRandom;
import java.util.Base64;

/**
 * Development tool: sets a new password for a local administrator (creating the account if it does not exist) in the
 * database started by LocalDevApplication, for when the password printed on first start was lost.
 * <pre>./mvnw spring-boot:test-run -Dspring-boot.run.main-class=com.indiaschoolfinder.LocalAdminPassword
 *   -Dspring-boot.run.arguments="admin"</pre>
 * With only a username a random password is generated and printed; a second argument sets that password instead
 * (at least 12 characters). Development only: on a server, manage administrators through the database and
 * ADMIN_BOOTSTRAP_* as described in DEPLOYMENT.md.
 */
public final class LocalAdminPassword {

    private LocalAdminPassword() {
    }

    public static void main(String[] args) {
        if (args.length < 1 || args[0].isBlank()) {
            throw new IllegalArgumentException("usage: LocalAdminPassword <username> [password]");
        }
        String username = args[0].trim();
        String password = args.length > 1 ? args[1] : generate();
        if (password.length() < 12) {
            throw new IllegalArgumentException("the password must be at least 12 characters");
        }
        int port = Integer.getInteger("isf.pg.port", 54329);
        System.setProperty("spring.datasource.url", "jdbc:postgresql://localhost:" + port + "/postgres");
        System.setProperty("spring.datasource.username", "postgres");
        System.setProperty("spring.datasource.password", "postgres");
        System.setProperty("app.jwt.secret", "local-admin-tool-only-not-used-for-any-token-0123456789");
        System.setProperty("app.scheduling.enabled", "false");
        System.setProperty("app.seed.enabled", "false");
        try (ConfigurableApplicationContext ctx = new SpringApplicationBuilder(IndiaSchoolFinderApplication.class)
                .web(WebApplicationType.NONE).profiles("dev").run()) {
            AdminUserRepository users = ctx.getBean(AdminUserRepository.class);
            PasswordEncoder encoder = ctx.getBean(PasswordEncoder.class);
            AdminUser user = users.findByUsernameIgnoreCase(username).orElseGet(() -> {
                AdminUser created = new AdminUser();
                created.setUsername(username);
                created.setRole(AdminRole.ADMIN);
                return created;
            });
            boolean existed = user.getId() != null;
            user.setPasswordHash(encoder.encode(password));
            user.setEnabled(true);
            users.save(user);
            System.out.printf("""

                    ================================================================
                     %s local administrator '%s' (%s)
                       password: %s
                     Sign in at http://localhost:5173/admin/login
                    ================================================================
                    %n""", existed ? "Updated" : "Created", user.getUsername(), user.getRole(), password);
        }
    }

    private static String generate() {
        byte[] bytes = new byte[12];
        new SecureRandom().nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }
}
