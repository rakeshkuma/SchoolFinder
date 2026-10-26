package com.indiaschoolfinder.mail;

import com.indiaschoolfinder.config.AppProperties;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;
import org.springframework.mail.javamail.JavaMailSender;

/**
 * Chooses how account email is sent: SMTP when spring.mail.host is set (Spring Boot then provides a JavaMailSender),
 * the in-memory development outbox when app.mail.dev-outbox=true, otherwise nothing (and the site says so).
 */
@Configuration
public class MailConfig {

    @Bean
    public MailService mailService(ObjectProvider<JavaMailSender> sender, AppProperties properties, Environment environment) {
        boolean devOutbox = properties.getMail().isDevOutbox();
        if (devOutbox && environment.acceptsProfiles(Profiles.of("prod"))) {
            throw new IllegalStateException("app.mail.dev-outbox must not be enabled in production");
        }
        // Docker Compose passes unset variables as empty strings; an empty host means SMTP is not configured.
        String host = environment.getProperty("spring.mail.host");
        JavaMailSender smtp = host == null || host.isBlank() ? null : sender.getIfAvailable();
        if (smtp != null) {
            String from = properties.getMail().getFrom();
            if (from == null || from.isBlank()) {
                throw new IllegalStateException("Set MAIL_FROM (app.mail.from) when SMTP is configured");
            }
            return new SmtpMailService(smtp, from);
        }
        return devOutbox ? new DevOutboxMailService() : new UnconfiguredMailService();
    }
}
