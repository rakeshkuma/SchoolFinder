package com.indiaschoolfinder.service;

import com.indiaschoolfinder.config.AppProperties;
import com.indiaschoolfinder.dto.common.PageResponse;
import com.indiaschoolfinder.dto.document.DocumentDtos.Detail;
import com.indiaschoolfinder.dto.document.DocumentDtos.ReviewRequest;
import com.indiaschoolfinder.dto.document.DocumentDtos.Summary;
import com.indiaschoolfinder.dto.document.DocumentDtos.UploadRequest;
import com.indiaschoolfinder.entity.School;
import com.indiaschoolfinder.entity.SourceDocument;
import com.indiaschoolfinder.entity.SourceDocumentFile;
import com.indiaschoolfinder.enums.DocumentStatus;
import com.indiaschoolfinder.enums.ExtractionMethod;
import com.indiaschoolfinder.exception.BusinessValidationException;
import com.indiaschoolfinder.exception.ResourceNotFoundException;
import com.indiaschoolfinder.repository.SchoolRepository;
import com.indiaschoolfinder.repository.SourceDocumentFileRepository;
import com.indiaschoolfinder.repository.SourceDocumentRepository;
import com.indiaschoolfinder.util.InputSanitizer;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.rendering.ImageType;
import org.apache.pdfbox.rendering.PDFRenderer;
import org.apache.pdfbox.text.PDFTextStripper;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Clock;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * Review of official notices (admission advertisements, fee circulars, result notices). The text is read from the PDF's
 * text layer, or by OCR for scans when an engine is configured; a reviewer compares it with the page images, corrects
 * it and marks it verified before anything taken from it is used. Files are uploaded by staff; the server never fetches
 * a URL, so it cannot be pointed at internal addresses.
 */
@Service
public class DocumentReviewService {

    public static final long MAX_BYTES = 15L * 1024 * 1024;
    /** A PDF whose text layer has fewer characters per page than this is treated as a scan. */
    private static final int MIN_TEXT_PER_PAGE = 40;
    private static final float READ_DPI = 200;
    private static final float VIEW_DPI = 110;

    public record PageImage(byte[] png) {
    }

    private final SourceDocumentRepository documents;
    private final SourceDocumentFileRepository files;
    private final SchoolRepository schools;
    private final OcrEngine ocr;
    private final AuditService audit;
    private final AppProperties.Ocr config;
    private final Clock clock;

    public DocumentReviewService(SourceDocumentRepository documents, SourceDocumentFileRepository files,
                                 SchoolRepository schools, OcrEngine ocr, AuditService audit, AppProperties properties,
                                 Clock clock) {
        this.documents = documents;
        this.files = files;
        this.schools = schools;
        this.ocr = ocr;
        this.audit = audit;
        this.config = properties.getOcr();
        this.clock = clock;
    }

    /** Reading and OCR happen before the transaction opens, so a slow OCR run never holds a database connection. */
    public Detail upload(MultipartFile file, UploadRequest meta) {
        byte[] bytes = readChecked(file);
        String kind = kindOf(bytes);
        String sha = sha256(bytes);
        documents.findBySha256(sha).ifPresent(d -> {
            throw new BusinessValidationException("file", "this file was already uploaded as document #" + d.getId());
        });
        if (meta.schoolId() != null && !schools.existsById(meta.schoolId())) {
            throw new ResourceNotFoundException("School", meta.schoolId());
        }
        Extraction x = extract(bytes, kind);

        SourceDocument d = new SourceDocument();
        d.setSchoolId(meta.schoolId());
        d.setExamSlug(meta.examSlug());
        d.setTitle(InputSanitizer.clean(meta.title()));
        d.setSourceUrl(meta.sourceUrl().trim());
        d.setPublishedOn(meta.publishedOn());
        d.setFileName(cleanFileName(file.getOriginalFilename()));
        d.setContentType(kind);
        d.setSizeBytes(bytes.length);
        d.setSha256(sha);
        d.setPageCount(x.pages());
        d.setExtractionMethod(x.method());
        d.setExtractedText(x.text());
        d.setReviewedText(x.text());
        SourceDocument saved = documents.save(d);
        SourceDocumentFile f = new SourceDocumentFile();
        f.setDocumentId(saved.getId());
        f.setData(bytes);
        files.save(f);
        audit.record("DOCUMENT_UPLOADED", "SOURCE_DOCUMENT", saved.getId(),
                "pages=" + x.pages() + ", method=" + x.method() + ", source=" + saved.getSourceUrl());
        return detail(saved);
    }

    @Transactional(readOnly = true)
    public PageResponse<Summary> list(DocumentStatus status, Long schoolId, int page, int size) {
        Page<SourceDocument> result = documents.search(status, schoolId, PageRequest.of(page, size));
        Map<Long, String> names = schoolNames(result.getContent());
        return PageResponse.of(result, d -> summary(d, names));
    }

    @Transactional(readOnly = true)
    public Detail get(Long id) {
        return detail(find(id));
    }

    @Transactional(readOnly = true)
    public PageImage page(Long id, int pageNo) {
        SourceDocument d = find(id);
        if (pageNo < 1 || pageNo > d.getPageCount()) {
            throw new BusinessValidationException("page", "the document has pages 1 to " + d.getPageCount());
        }
        byte[] bytes = files.findById(id).orElseThrow(() -> new ResourceNotFoundException("Document file", id)).getData();
        try {
            BufferedImage image = d.getContentType().equals("application/pdf")
                    ? withPdf(bytes, pdf -> new PDFRenderer(pdf).renderImageWithDPI(pageNo - 1, VIEW_DPI, ImageType.RGB))
                    : ImageIO.read(new ByteArrayInputStream(bytes));
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            ImageIO.write(image, "png", out);
            return new PageImage(out.toByteArray());
        } catch (IOException e) {
            throw new BusinessValidationException("file", "the page could not be drawn: " + e.getMessage());
        }
    }

    @Transactional
    public Detail review(Long id, ReviewRequest r) {
        SourceDocument d = find(id);
        String text = r.reviewedText() == null || r.reviewedText().isBlank() ? null : r.reviewedText().strip();
        String note = InputSanitizer.clean(r.note());
        switch (r.status()) {
            case VERIFIED -> {
                if (text == null) {
                    throw new BusinessValidationException("reviewedText", "type or correct the notice's text before marking it verified");
                }
            }
            case REJECTED -> {
                if (note == null) {
                    throw new BusinessValidationException("note", "say why the document is rejected (wrong school, unreadable, not official …)");
                }
            }
            case PENDING_REVIEW -> { }
        }
        d.setReviewedText(text);
        d.setReviewNote(note);
        d.setStatus(r.status());
        d.setReviewedBy(r.status() == DocumentStatus.PENDING_REVIEW ? null : currentUser());
        d.setReviewedAt(r.status() == DocumentStatus.PENDING_REVIEW ? null : clock.instant());
        audit.record("DOCUMENT_REVIEWED", "SOURCE_DOCUMENT", id, "status=" + r.status() + (note == null ? "" : ", note=" + note));
        return detail(documents.saveAndFlush(d));
    }

    /** Runs OCR again (e.g. after an engine was installed); the reviewer's text is kept, the decision reset. */
    public Detail rerunOcr(Long id) {
        if (!ocr.isAvailable()) {
            throw new BusinessValidationException("ocr", "OCR is not configured on this server (app.ocr.tesseract-command)");
        }
        SourceDocument d = find(id);
        byte[] bytes = files.findById(id).orElseThrow(() -> new ResourceNotFoundException("Document file", id)).getData();
        Extraction x = extract(bytes, d.getContentType(), true);
        d.setExtractedText(x.text());
        d.setExtractionMethod(x.method());
        if (d.getReviewedText() == null) d.setReviewedText(x.text());
        d.setStatus(DocumentStatus.PENDING_REVIEW);
        d.setReviewedBy(null);
        d.setReviewedAt(null);
        audit.record("DOCUMENT_OCR", "SOURCE_DOCUMENT", id, "method=" + x.method());
        return detail(documents.saveAndFlush(d));
    }

    @Transactional
    public void delete(Long id) {
        SourceDocument d = find(id);
        documents.delete(d);
        audit.record("DOCUMENT_DELETED", "SOURCE_DOCUMENT", id, d.getTitle());
    }

    // ---------------------------------------------------------------------------------------------

    private record Extraction(int pages, ExtractionMethod method, String text) {
    }

    private interface PdfWork<T> {
        T apply(PDDocument pdf) throws IOException;
    }

    private static <T> T withPdf(byte[] bytes, PdfWork<T> work) throws IOException {
        try (PDDocument pdf = Loader.loadPDF(bytes)) {
            return work.apply(pdf);
        }
    }

    private Extraction extract(byte[] bytes, String kind) {
        return extract(bytes, kind, false);
    }

    /** Text layer first; OCR for scans (or when forced) if an engine is configured; otherwise nothing, to be transcribed. */
    private Extraction extract(byte[] bytes, String kind, boolean forceOcr) {
        try {
            if (!kind.equals("application/pdf")) {
                BufferedImage image = ImageIO.read(new ByteArrayInputStream(bytes));
                if (image == null) throw new BusinessValidationException("file", "the image could not be read");
                Optional<String> text = ocr.read(image);
                return new Extraction(1, text.isPresent() ? ExtractionMethod.OCR : ExtractionMethod.NONE, text.orElse(null));
            }
            return withPdf(bytes, pdf -> {
                int pages = pdf.getNumberOfPages();
                int readable = Math.min(pages, config.getMaxPages());
                PDFTextStripper stripper = new PDFTextStripper();
                stripper.setEndPage(readable);
                String layer = stripper.getText(pdf).strip();
                boolean scanned = layer.replaceAll("\\s+", "").length() < MIN_TEXT_PER_PAGE * readable;
                if ((scanned || forceOcr) && ocr.isAvailable()) {
                    PDFRenderer renderer = new PDFRenderer(pdf);
                    List<String> parts = new ArrayList<>();
                    for (int i = 0; i < readable; i++) {
                        int pageNo = i + 1;
                        ocr.read(renderer.renderImageWithDPI(i, READ_DPI, ImageType.GRAY))
                                .ifPresent(t -> parts.add("— Page " + pageNo + " —\n" + t));
                    }
                    if (!parts.isEmpty()) return new Extraction(pages, ExtractionMethod.OCR, String.join("\n\n", parts));
                }
                return scanned ? new Extraction(pages, ExtractionMethod.NONE, layer.isEmpty() ? null : layer)
                        : new Extraction(pages, ExtractionMethod.TEXT_LAYER, layer);
            });
        } catch (IOException e) {
            throw new BusinessValidationException("file", "the PDF could not be read: " + e.getMessage());
        }
    }

    private static byte[] readChecked(MultipartFile file) {
        if (file == null || file.isEmpty()) throw new BusinessValidationException("file", "choose a PDF or image file");
        if (file.getSize() > MAX_BYTES) throw new BusinessValidationException("file", "the file must be at most 15 MB");
        try {
            return file.getBytes();
        } catch (IOException e) {
            throw new BusinessValidationException("file", "the file could not be read");
        }
    }

    /** The type comes from the file's own first bytes, not from the name or the browser's claim. */
    static String kindOf(byte[] b) {
        if (b.length > 4 && b[0] == '%' && b[1] == 'P' && b[2] == 'D' && b[3] == 'F') return "application/pdf";
        if (b.length > 8 && (b[0] & 0xff) == 0x89 && b[1] == 'P' && b[2] == 'N' && b[3] == 'G') return "image/png";
        if (b.length > 3 && (b[0] & 0xff) == 0xff && (b[1] & 0xff) == 0xd8 && (b[2] & 0xff) == 0xff) return "image/jpeg";
        throw new BusinessValidationException("file", "only PDF, PNG and JPEG files are accepted");
    }

    private static String sha256(byte[] bytes) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }

    private static String cleanFileName(String name) {
        String n = name == null ? "" : name.replaceAll("[\\\\/]", "_").replaceAll("[^\\p{L}\\p{N}._ -]", "").strip();
        return n.isEmpty() ? "document" : n.length() > 255 ? n.substring(0, 255) : n;
    }

    private static String currentUser() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        return auth == null ? "system" : auth.getName();
    }

    private SourceDocument find(Long id) {
        return documents.findById(id).orElseThrow(() -> new ResourceNotFoundException("Document", id));
    }

    private Map<Long, String> schoolNames(List<SourceDocument> docs) {
        return schools.findAllById(docs.stream().map(SourceDocument::getSchoolId).filter(java.util.Objects::nonNull).toList())
                .stream().collect(Collectors.toMap(School::getId, School::getName, (a, b) -> a));
    }

    private Detail detail(SourceDocument d) {
        return new Detail(summary(d, schoolNames(List.of(d))), d.getExtractedText(), d.getReviewedText(), d.getReviewNote(),
                ocr.isAvailable());
    }

    private static Summary summary(SourceDocument d, Map<Long, String> names) {
        return new Summary(d.getId(), d.getTitle(), d.getSourceUrl(), d.getSchoolId(),
                d.getSchoolId() == null ? null : names.get(d.getSchoolId()), d.getExamSlug(), d.getPublishedOn(),
                d.getFileName(), d.getContentType(), d.getSizeBytes(), d.getPageCount(), d.getExtractionMethod(),
                d.getStatus(), d.getCreatedAt(), d.getReviewedBy(), d.getReviewedAt());
    }
}
