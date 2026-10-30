package com.indiaschoolfinder.service;

import java.awt.image.BufferedImage;
import java.util.Optional;

/** Reads text from a page image. Optional: when no engine is configured, scans are transcribed by the reviewer. */
public interface OcrEngine {

    boolean isAvailable();

    /** The page's text, or empty when the engine is unavailable or read nothing. */
    Optional<String> read(BufferedImage page);
}
