package com.indiaschoolfinder.mail;

import com.indiaschoolfinder.config.AppProperties;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.support.DefaultListableBeanFactory;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.mock.env.MockEnvironment;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class MailConfigTest {

    private final MailConfig config = new MailConfig();

    private static ObjectProvider<JavaMailSender> sender(boolean present) {
        DefaultListableBeanFactory factory = new DefaultListableBeanFactory();
        if (present) factory.registerSingleton("mailSender", new JavaMailSenderImpl());
        return factory.getBeanProvider(JavaMailSender.class);
    }

    private static AppProperties properties(String from, boolean devOutbox) {
        AppProperties properties = new AppProperties();
        properties.getMail().setFrom(from);
        properties.getMail().setDevOutbox(devOutbox);
        return properties;
    }

    @Test
    void smtpNeedsAHostAndASender() {
        MockEnvironment env = new MockEnvironment().withProperty("spring.mail.host", "smtp.example.org");
        MailService mail = config.mailService(sender(true), properties("noreply@example.org", false), env);
        assertThat(mail.mode()).isEqualTo("smtp");
        assertThat(mail.deliveryConfigured()).isTrue();
    }

    @Test
    void blankHostFromComposeMeansNotConfigured() {
        MockEnvironment env = new MockEnvironment().withProperty("spring.mail.host", " ");
        MailService mail = config.mailService(sender(true), properties("", false), env);
        assertThat(mail.mode()).isEqualTo("none");
        assertThat(mail.deliveryConfigured()).isFalse();
    }

    @Test
    void smtpWithoutFromAddressRefusesToStart() {
        MockEnvironment env = new MockEnvironment().withProperty("spring.mail.host", "smtp.example.org");
        assertThatThrownBy(() -> config.mailService(sender(true), properties(" ", false), env))
                .isInstanceOf(IllegalStateException.class);
    }

    @Test
    void devOutboxOnlyOutsideProduction() {
        assertThat(config.mailService(sender(false), properties("", true), new MockEnvironment()).mode())
                .isEqualTo("dev-outbox");
        MockEnvironment prod = new MockEnvironment();
        prod.setActiveProfiles("prod");
        assertThatThrownBy(() -> config.mailService(sender(false), properties("", true), prod))
                .isInstanceOf(IllegalStateException.class);
    }
}
