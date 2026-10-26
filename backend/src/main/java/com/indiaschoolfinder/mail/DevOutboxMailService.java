package com.indiaschoolfinder.mail;

import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.List;

/**
 * Development and test only: keeps the last messages in memory so the local tools and tests can follow the links.
 * Nothing is sent and nothing is logged. Never enabled under the prod profile (see {@link MailConfig}).
 */
public class DevOutboxMailService implements MailService {

    public record Message(String to, String subject, String text, Instant at) {
    }

    private static final int MAX = 50;
    private final Deque<Message> messages = new ArrayDeque<>();

    @Override
    public synchronized void send(String to, String subject, String text) {
        messages.addFirst(new Message(to, subject, text, Instant.now()));
        while (messages.size() > MAX) {
            messages.removeLast();
        }
    }

    @Override
    public boolean deliveryConfigured() {
        return true;
    }

    @Override
    public String mode() {
        return "dev-outbox";
    }

    /** Newest first. */
    public synchronized List<Message> messages() {
        return List.copyOf(messages);
    }

    public synchronized void clear() {
        messages.clear();
    }
}
