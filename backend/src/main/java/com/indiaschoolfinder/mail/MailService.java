package com.indiaschoolfinder.mail;

/**
 * Sends account email (verification, password reset, notifications). Implementations never log message bodies,
 * because they contain one-time links.
 */
public interface MailService {

    void send(String to, String subject, String text);

    /** As {@link #send(String, String, String)}, with a Reply-To address so that a reply goes straight to that person. */
    default void send(String to, String subject, String text, String replyTo) {
        send(to, subject, text);
    }

    /** False when no provider is configured, so the site can say so instead of claiming email was sent. */
    boolean deliveryConfigured();

    /** "smtp", "dev-outbox" (development: nothing leaves the machine) or "none". */
    String mode();
}
