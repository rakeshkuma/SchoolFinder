package com.indiaschoolfinder.notifications.source;

/** The source answered, but its page no longer looks as the adapter expects (reported, never guessed around). */
public class SourceLayoutException extends Exception {

    public SourceLayoutException(String message) {
        super(message);
    }
}
