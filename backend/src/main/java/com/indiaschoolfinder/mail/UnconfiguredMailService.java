package com.indiaschoolfinder.mail;

import lombok.extern.slf4j.Slf4j;

/** Used when no SMTP server is configured: nothing is sent, and the site tells members email is unavailable. */
@Slf4j
public class UnconfiguredMailService implements MailService {

    @Override
    public void send(String to, String subject, String text) {
        log.warn("Account email not sent ({}): no mail provider is configured (set SPRING_MAIL_HOST etc.)", subject);
    }

    @Override
    public boolean deliveryConfigured() {
        return false;
    }

    @Override
    public String mode() {
        return "none";
    }
}
