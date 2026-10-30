package com.indiaschoolfinder.service.impl;

import com.indiaschoolfinder.config.AppProperties;
import com.indiaschoolfinder.service.OcrEngine;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.TimeUnit;

/**
 * Runs the Tesseract command-line program (https://github.com/tesseract-ocr/tesseract) on one page at a time. The
 * command comes from configuration only, never from a request, and the image is passed as a temporary file.
 */
@Slf4j
@Service
public class TesseractOcrEngine implements OcrEngine {

    private final AppProperties.Ocr config;

    public TesseractOcrEngine(AppProperties properties) {
        this.config = properties.getOcr();
    }

    @Override
    public boolean isAvailable() {
        return config.isConfigured();
    }

    @Override
    public Optional<String> read(BufferedImage page) {
        if (!isAvailable()) return Optional.empty();
        Path image = null;
        try {
            image = Files.createTempFile("isf-ocr-", ".png");
            ImageIO.write(page, "png", image.toFile());
            // Output goes to <base>.txt, so a stuck process cannot block on a full pipe and the timeout always applies.
            String base = image.toString().substring(0, image.toString().length() - ".png".length());
            Process p = new ProcessBuilder(List.of(config.getTesseractCommand().trim(), image.toString(), base,
                    "-l", config.getLanguages())).redirectOutput(ProcessBuilder.Redirect.DISCARD)
                    .redirectError(ProcessBuilder.Redirect.DISCARD).start();
            if (!p.waitFor(config.getTimeout().toMillis(), TimeUnit.MILLISECONDS)) {
                p.destroyForcibly();
                log.warn("OCR timed out");
                return Optional.empty();
            }
            if (p.exitValue() != 0) {
                log.warn("OCR exited with {}", p.exitValue());
                return Optional.empty();
            }
            Path out = Path.of(base + ".txt");
            String text = Files.exists(out) ? Files.readString(out, StandardCharsets.UTF_8).strip() : "";
            Files.deleteIfExists(out);
            return text.isEmpty() ? Optional.empty() : Optional.of(text);
        } catch (IOException e) {
            log.warn("OCR could not run: {}", e.getMessage());
            return Optional.empty();
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return Optional.empty();
        } finally {
            if (image != null) {
                try {
                    Files.deleteIfExists(image);
                } catch (IOException ignored) {
                    // a temporary file left behind is removed by the OS
                }
            }
        }
    }
}
