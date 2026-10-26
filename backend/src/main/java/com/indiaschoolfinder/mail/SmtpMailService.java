package com.indiaschoolfinder.mail;

import lombok.extern.slf4j.Slf4j;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;

/** Sends through the SMTP server configured with spring.mail.* (credentials from environment variables). */
@Slf4j
public class SmtpMailService implements MailService {

    private final JavaMailSender sender;
    private final String from;

    public SmtpMailService(JavaMailSender sender, String from) {
        this.sender = sender;
        this.from = from;
    }

    @Override
    public void send(String to, String subject, String text) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(from);
        message.setTo(to);
        message.setSubject(subject);
        message.setText(text);
        try {
            sender.send(message);
        } catch (MailException e) {
            // The address and body are left out of the log on purpose.
            log.error("Account email could not be sent ({}): {}", subject, e.getClass().getSimpleName());
        }
    }

    @Override
    public boolean deliveryConfigured() {
        return true;
    }

    @Override
    public String mode() {
        return "smtp";
    }
}
