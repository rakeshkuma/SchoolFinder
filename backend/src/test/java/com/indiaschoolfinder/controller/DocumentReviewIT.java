package com.indiaschoolfinder.controller;

import com.indiaschoolfinder.support.AbstractIntegrationTest;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.apache.pdfbox.pdmodel.graphics.image.LosslessFactory;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import javax.imageio.ImageIO;
import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.util.Map;

import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Official notices are read, shown page by page and verified by a person before their text is relied on. */
class DocumentReviewIT extends AbstractIntegrationTest {

    private static final String NOTICE = "https://www.example.org/notices/admission-2026.pdf";

    private static byte[] textPdf(String text) throws Exception {
        try (PDDocument pdf = new PDDocument(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            PDPage page = new PDPage();
            pdf.addPage(page);
            try (PDPageContentStream cs = new PDPageContentStream(pdf, page)) {
                cs.beginText();
                cs.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA), 12);
                cs.newLineAtOffset(72, 700);
                cs.showText(text);
                cs.endText();
            }
            pdf.save(out);
            return out.toByteArray();
        }
    }

    private static BufferedImage picture() {
        BufferedImage img = new BufferedImage(200, 100, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = img.createGraphics();
        g.setColor(Color.WHITE);
        g.fillRect(0, 0, 200, 100);
        g.setColor(Color.BLACK);
        g.drawString("scanned notice", 20, 50);
        g.dispose();
        return img;
    }

    /** A PDF that is only a picture, like a scanned notice: no text layer. */
    private static byte[] scannedPdf() throws Exception {
        try (PDDocument pdf = new PDDocument(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            PDPage page = new PDPage();
            pdf.addPage(page);
            try (PDPageContentStream cs = new PDPageContentStream(pdf, page)) {
                cs.drawImage(LosslessFactory.createFromImage(pdf, picture()), 50, 500, 400, 200);
            }
            pdf.save(out);
            return out.toByteArray();
        }
    }

    private static byte[] png() throws Exception {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        ImageIO.write(picture(), "png", out);
        return out.toByteArray();
    }

    private MockHttpServletRequestBuilder upload(byte[] file, String name, Map<String, Object> meta) throws Exception {
        return multipart("/api/v1/admin/documents")
                .file(new MockMultipartFile("file", name, "application/octet-stream", file))
                .file(new MockMultipartFile("metadata", "", "application/json", json(meta).getBytes()))
                .header("Authorization", editorToken());
    }

    @Test
    void aTextPdfIsReadAndMustBeCheckedBeforeItIsVerified() throws Exception {
        long school = createSchool(school("Notice School", Map.of()));
        byte[] pdf = textPdf("Admission to Class VI: last date to apply is 8 October 2026, entrance test on 6 December 2026.");
        long id = body(mockMvc.perform(upload(pdf, "notice.pdf", Map.of("title", "Admission notice 2026-27", "sourceUrl", NOTICE,
                        "schoolId", school, "publishedOn", "2026-08-13")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.document.extractionMethod").value("TEXT_LAYER"))
                .andExpect(jsonPath("$.document.status").value("PENDING_REVIEW"))
                .andExpect(jsonPath("$.document.pageCount").value(1))
                .andExpect(jsonPath("$.document.schoolName").value("Notice School"))
                .andExpect(jsonPath("$.extractedText").value(containsString("6 December 2026")))
                .andReturn()).get("document").get("id").asLong();

        // The same file twice is refused.
        mockMvc.perform(upload(pdf, "again.pdf", Map.of("title", "Again", "sourceUrl", NOTICE)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(containsString("document #" + id)));

        mockMvc.perform(get("/api/v1/admin/documents/{id}/pages/1", id).header("Authorization", editorToken()))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.IMAGE_PNG));
        mockMvc.perform(get("/api/v1/admin/documents/{id}/pages/2", id).header("Authorization", editorToken()))
                .andExpect(status().isBadRequest());

        mockMvc.perform(put("/api/v1/admin/documents/{id}/review", id).header("Authorization", editorToken())
                        .contentType(MediaType.APPLICATION_JSON).content(json(Map.of("status", "REJECTED"))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors[0].field").value("note"));
        mockMvc.perform(put("/api/v1/admin/documents/{id}/review", id).header("Authorization", editorToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("status", "VERIFIED", "reviewedText", "Last date 08.10.2026; exam 06.12.2026."))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.document.status").value("VERIFIED"))
                .andExpect(jsonPath("$.document.reviewedBy").value(EDITOR))
                .andExpect(jsonPath("$.reviewedText").value("Last date 08.10.2026; exam 06.12.2026."));

        mockMvc.perform(get("/api/v1/admin/documents").param("status", "VERIFIED").header("Authorization", editorToken()))
                .andExpect(jsonPath("$.totalElements").value(1));
        mockMvc.perform(get("/api/v1/admin/documents"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void scansAreFlaggedForTranscriptionWhenNoOcrEngineIsConfigured() throws Exception {
        mockMvc.perform(upload(scannedPdf(), "scan.pdf", Map.of("title", "Scanned notice", "sourceUrl", NOTICE)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.document.extractionMethod").value("NONE"))
                .andExpect(jsonPath("$.ocrAvailable").value(false));
        long id = body(mockMvc.perform(upload(png(), "photo.png", Map.of("title", "Photo of a notice board", "sourceUrl", NOTICE)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.document.contentType").value("image/png"))
                .andExpect(jsonPath("$.document.extractionMethod").value("NONE"))
                .andReturn()).get("document").get("id").asLong();
        mockMvc.perform(get("/api/v1/admin/documents/{id}/pages/1", id).header("Authorization", editorToken()))
                .andExpect(status().isOk());
        mockMvc.perform(post("/api/v1/admin/documents/{id}/ocr", id).header("Authorization", editorToken()))
                .andExpect(status().isBadRequest());
        // A verified decision needs the text typed from the page images.
        mockMvc.perform(put("/api/v1/admin/documents/{id}/review", id).header("Authorization", editorToken())
                        .contentType(MediaType.APPLICATION_JSON).content(json(Map.of("status", "VERIFIED"))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors[0].field").value("reviewedText"));
    }

    @Test
    void onlyPdfAndImageFilesWithASourceAreAccepted() throws Exception {
        mockMvc.perform(upload("<html>not a pdf</html>".getBytes(), "notice.pdf", Map.of("title", "Fake", "sourceUrl", NOTICE)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors[0].field").value("file"));
        mockMvc.perform(upload(textPdf("x"), "n.pdf", Map.of("title", "No source", "sourceUrl", "not a url")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors[0].field").value("sourceUrl"));
    }
}
