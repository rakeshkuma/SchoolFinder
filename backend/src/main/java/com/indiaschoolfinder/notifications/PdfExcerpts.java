package com.indiaschoolfinder.notifications;

import org.apache.pdfbox.Loader;
import org.apache.pdfbox.io.RandomAccessReadBuffer;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;

import java.io.IOException;

/**
 * The opening text of a notice PDF, for the editor reviewing it: a few hundred characters from the first pages, read
 * from a size-limited download. Encrypted, scanned (no text layer) or broken files give nothing. Never published.
 */
public final class PdfExcerpts {

    private PdfExcerpts() {
    }

    public static String excerpt(byte[] pdf, int maxPages, int maxChars) {
        if (pdf == null || pdf.length < 5 || !new String(pdf, 0, 5, java.nio.charset.StandardCharsets.US_ASCII).startsWith("%PDF")) {
            return null;
        }
        try (PDDocument doc = Loader.loadPDF(new RandomAccessReadBuffer(pdf))) {
            if (doc.isEncrypted()) {
                return null;
            }
            PDFTextStripper stripper = new PDFTextStripper();
            stripper.setStartPage(1);
            stripper.setEndPage(Math.max(1, Math.min(maxPages, doc.getNumberOfPages())));
            String text = stripper.getText(doc).replace(' ', ' ').replaceAll("\\s+", " ").trim();
            if (text.length() < 20) {
                return null; // a scan without a text layer
            }
            if (text.length() <= maxChars) {
                return text;
            }
            int cut = text.lastIndexOf(' ', maxChars - 1);
            return text.substring(0, cut > maxChars / 2 ? cut : maxChars - 1) + "…";
        } catch (IOException | RuntimeException e) {
            return null;
        }
    }
}
