package com.indiaschoolfinder;

import com.indiaschoolfinder.entity.AdminUser;
import com.indiaschoolfinder.enums.AdminRole;
import com.indiaschoolfinder.repository.AdminUserRepository;
import org.springframework.boot.WebApplicationType;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.security.crypto.password.PasswordEncoder;

/**
 * Development tool: sets the password of an administrator in the database started by LocalDevApplication, creating
 * the account (role ADMIN) if it does not exist. The bootstrap account is created only on an empty database, so after
 * a few local runs nobody knows its password; this tool gives the local admin a known one for import scripts. The
 * password is read from LOCAL_ADMIN_PASSWORD (at least 12 characters), never from the command line. Development only.
 * <pre>LOCAL_ADMIN_PASSWORD=... ./mvnw spring-boot:test-run -Dspring-boot.run.main-class=com.indiaschoolfinder.LocalAdminReset
 *   -Dspring-boot.run.arguments="admin"</pre>
 */
public final class LocalAdminReset {

    private LocalAdminReset() {
    }

    public static void main(String[] args) {
        String username = args.length > 0 ? args[0] : "admin";
        String password = System.getenv("LOCAL_ADMIN_PASSWORD");
        if (password == null || password.length() < 12) {
            throw new IllegalArgumentException("set LOCAL_ADMIN_PASSWORD (at least 12 characters)");
        }
        int port = Integer.getInteger("isf.pg.port", 54329);
        System.setProperty("spring.datasource.url", "jdbc:postgresql://localhost:" + port + "/postgres");
        System.setProperty("spring.datasource.username", "postgres");
        System.setProperty("spring.datasource.password", "postgres");
        System.setProperty("app.jwt.secret", "local-admin-reset-tool-only-not-used-for-any-token-0123456789");
        System.setProperty("app.scheduling.enabled", "false");
        System.setProperty("app.seed.enabled", "false");
        System.setProperty("server.port", "0");
        try (ConfigurableApplicationContext ctx = new SpringApplicationBuilder(IndiaSchoolFinderApplication.class)
                .web(WebApplicationType.SERVLET).profiles("dev").run()) {
            AdminUserRepository users = ctx.getBean(AdminUserRepository.class);
            PasswordEncoder encoder = ctx.getBean(PasswordEncoder.class);
            AdminUser user = users.findByUsernameIgnoreCase(username).orElseGet(() -> {
                AdminUser created = new AdminUser();
                created.setUsername(username);
                created.setRole(AdminRole.ADMIN);
                return created;
            });
            user.setPasswordHash(encoder.encode(password));
            user.setEnabled(true);
            users.save(user);
            System.out.println("LOCAL ADMIN READY: " + username + (user.getId() == null ? " (created)" : " (password set)"));
        }
    }
}
