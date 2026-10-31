package com.indiaschoolfinder.service.impl;

import com.indiaschoolfinder.dto.admin.CsvImportResult;
import com.indiaschoolfinder.dto.admin.CsvImportResult.RowError;
import com.indiaschoolfinder.dto.common.PageResponse;
import com.indiaschoolfinder.dto.ranking.ExternalRankingDto;
import com.indiaschoolfinder.dto.ranking.ExternalRankingListItemDto;
import com.indiaschoolfinder.dto.ranking.ExternalRankingRequest;
import com.indiaschoolfinder.dto.ranking.ExternalRankingVerifyRequest;
import com.indiaschoolfinder.dto.ranking.RankingPublisherDto;
import com.indiaschoolfinder.dto.ranking.RankingPublisherRequest;
import com.indiaschoolfinder.entity.RankingPublisher;
import com.indiaschoolfinder.entity.RankingSource;
import com.indiaschoolfinder.entity.School;
import com.indiaschoolfinder.enums.RankingScope;
import com.indiaschoolfinder.enums.VerificationStatus;
import com.indiaschoolfinder.exception.BusinessValidationException;
import com.indiaschoolfinder.exception.ResourceNotFoundException;
import com.indiaschoolfinder.repository.RankingPublisherRepository;
import com.indiaschoolfinder.repository.RankingSourceRepository;
import com.indiaschoolfinder.repository.SchoolRepository;
import com.indiaschoolfinder.service.AuditService;
import com.indiaschoolfinder.service.CsvImportService;
import com.indiaschoolfinder.service.ExternalRankingService;
import com.indiaschoolfinder.util.InputSanitizer;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validator;
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVParser;
import org.apache.commons.csv.CSVRecord;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.Reader;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.function.Function;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
public class ExternalRankingServiceImpl implements ExternalRankingService {

    private static final int MAX_ROWS = 5000;
    /** "2025" or "2025-26", as publishers name their editions. */
    private static final Pattern YEAR = Pattern.compile("\\d{4}(-\\d{2})?");
    private static final Pattern CODE = Pattern.compile("[A-Z0-9_]{2,40}");
    /** Positions only compare within one list, so lists are grouped and each is in rank order. */
    private static final Sort PUBLIC_ORDER = Sort.by(Sort.Order.desc("rankingYear"), Sort.Order.asc("publisher"),
            Sort.Order.asc("rankingName"), Sort.Order.asc("category"), Sort.Order.asc("region"),
            Sort.Order.asc("rankPosition").nullsLast(), Sort.Order.asc("id"));

    private final RankingSourceRepository sourceRepository;
    private final RankingPublisherRepository publisherRepository;
    private final SchoolRepository schoolRepository;
    private final AuditService auditService;
    private final Validator validator;
    private final Clock clock;

    public ExternalRankingServiceImpl(RankingSourceRepository sourceRepository, RankingPublisherRepository publisherRepository,
                                      SchoolRepository schoolRepository, AuditService auditService, Validator validator,
                                      Clock clock) {
        this.sourceRepository = sourceRepository;
        this.publisherRepository = publisherRepository;
        this.schoolRepository = schoolRepository;
        this.auditService = auditService;
        this.validator = validator;
        this.clock = clock;
    }

    // --- publishers ------------------------------------------------------------------------------

    @Override
    @Transactional(readOnly = true)
    public List<RankingPublisherDto> publishers(boolean includeInactive) {
        Map<Long, Long> counts = new HashMap<>();
        for (Object[] row : sourceRepository.countByPublisher(VerificationStatus.VERIFIED)) {
            counts.put((Long) row[0], (Long) row[1]);
        }
        return publisherRepository.findAllByOrderByNameAsc().stream()
                .filter(p -> includeInactive || p.isActive())
                .map(p -> toDto(p, counts.getOrDefault(p.getId(), 0L)))
                .toList();
    }

    @Override
    @Transactional
    public RankingPublisherDto savePublisher(String code, RankingPublisherRequest r) {
        String normalized = code == null ? "" : code.trim().toUpperCase(Locale.ROOT);
        if (!CODE.matcher(normalized).matches()) {
            throw new BusinessValidationException("code", "use 2–40 capital letters, digits or underscores, e.g. EDUCATIONWORLD");
        }
        RankingPublisher p = publisherRepository.findByCodeIgnoreCase(normalized).orElseGet(() -> {
            RankingPublisher created = new RankingPublisher();
            created.setCode(normalized);
            return created;
        });
        boolean isNew = p.getId() == null;
        String name = InputSanitizer.clean(r.name());
        publisherRepository.findByNameIgnoreCase(name).filter(other -> !other.getCode().equals(normalized)).ifPresent(other -> {
            throw new BusinessValidationException("name", "publisher " + other.getCode() + " already has this name");
        });
        String oldName = p.getName();
        p.setName(name);
        p.setKind(r.kind());
        p.setWebsiteUrl(blankToNull(r.websiteUrl()));
        p.setMethodologyUrl(blankToNull(r.methodologyUrl()));
        p.setDescription(InputSanitizer.clean(r.description()));
        p.setActive(r.active() == null || r.active());
        RankingPublisher saved = publisherRepository.save(p);
        if (oldName != null && !oldName.equals(name)) {
            // Entries keep the publisher's display name with them.
            sourceRepository.renamePublisher(saved.getId(), name);
        }
        auditService.record(isNew ? "RANKING_PUBLISHER_ADDED" : "RANKING_PUBLISHER_UPDATED", "RANKING_PUBLISHER",
                saved.getId(), "code=" + normalized);
        return toDto(saved, 0);
    }

    // --- lists -----------------------------------------------------------------------------------

    @Override
    @Transactional(readOnly = true)
    public PageResponse<ExternalRankingListItemDto> publicList(Filter f, int page, int size) {
        return list(f, VerificationStatus.VERIFIED, false, true, PageRequest.of(page, size, PUBLIC_ORDER));
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<ExternalRankingListItemDto> adminList(Filter f, int page, int size) {
        return list(f, f.status(), true, false,
                PageRequest.of(page, size, Sort.by(Sort.Order.desc("updatedAt"), Sort.Order.desc("id"))));
    }

    private PageResponse<ExternalRankingListItemDto> list(Filter f, VerificationStatus status, boolean includeSponsored,
                                                          boolean activeOnly, PageRequest pageable) {
        List<Long> publisherIds = null;
        if (f.publisherCode() != null) {
            publisherIds = publisherRepository.findByCodeIgnoreCase(f.publisherCode().trim()).map(p -> List.of(p.getId()))
                    .orElse(List.of());
        } else if (f.kind() != null) {
            publisherIds = publisherRepository.findAll().stream().filter(p -> p.getKind() == f.kind())
                    .map(RankingPublisher::getId).toList();
        }
        if (publisherIds != null && publisherIds.isEmpty()) {
            return PageResponse.of(Page.empty(pageable));
        }
        Page<RankingSource> result = sourceRepository.search(publisherIds == null,
                publisherIds == null ? List.of(-1L) : publisherIds, blankToNull(f.year()), blankToNull(f.category()),
                f.scope(), blankToNull(f.region()), status, includeSponsored || f.includeSponsored(), f.schoolId(),
                activeOnly, pageable);
        Map<Long, School> schools = schoolRepository.findAllById(
                        result.getContent().stream().map(RankingSource::getSchoolId).collect(Collectors.toSet()))
                .stream().collect(Collectors.toMap(School::getId, Function.identity()));
        Map<Long, String> codes = publisherCodes();
        return PageResponse.of(result, s -> {
            School school = schools.get(s.getSchoolId());
            return new ExternalRankingListItemDto(toDto(s, codes), s.getSchoolId(), school == null ? null : school.getName(),
                    school == null ? null : school.getSlug(), school == null ? null : school.getCity(),
                    school == null ? null : school.getStateCode());
        });
    }

    @Override
    @Transactional(readOnly = true)
    public Facets facets() {
        return new Facets(sourceRepository.years(VerificationStatus.VERIFIED),
                sourceRepository.categories(VerificationStatus.VERIFIED));
    }

    @Override
    @Transactional(readOnly = true)
    public List<ExternalRankingDto> forSchool(Long schoolId) {
        Map<Long, String> codes = publisherCodes();
        return sourceRepository.findBySchoolIdAndVerificationStatusOrderByRankingYearDesc(schoolId, VerificationStatus.VERIFIED)
                .stream().map(s -> toDto(s, codes)).toList();
    }

    // --- single entries --------------------------------------------------------------------------

    @Override
    @Transactional
    public ExternalRankingDto add(Long schoolId, ExternalRankingRequest r) {
        if (!schoolRepository.existsById(schoolId)) {
            throw new ResourceNotFoundException("School", schoolId);
        }
        List<RowError> errors = new ArrayList<>();
        Optional<RankingPublisher> publisher = checkEntry(r, 0, errors);
        throwIfAny(errors);
        String publisherName = publisherName(r, publisher);
        sourceRepository.findEntry(schoolId, publisherName, r.rankingName().trim(), r.rankingYear().trim(),
                Objects.requireNonNullElse(InputSanitizer.clean(r.category()), ""),
                Objects.requireNonNullElse(InputSanitizer.clean(r.region()), "")).ifPresent(existing -> {
            throw new BusinessValidationException("rankingName",
                    "this school already has an entry in this list (id " + existing.getId() + "); edit that entry instead");
        });
        RankingSource source = new RankingSource();
        source.setSchoolId(schoolId);
        apply(source, r, publisher);
        RankingSource saved = sourceRepository.save(source);
        auditService.record("EXTERNAL_RANKING_ADDED", "RANKING_SOURCE", saved.getId(),
                "school=" + schoolId + ", publisher=" + saved.getPublisher());
        return toDto(saved, publisherCodes());
    }

    @Override
    @Transactional
    public ExternalRankingDto update(Long id, ExternalRankingRequest r) {
        RankingSource source = find(id);
        List<RowError> errors = new ArrayList<>();
        Optional<RankingPublisher> publisher = checkEntry(r, 0, errors);
        throwIfAny(errors);
        apply(source, r, publisher);
        source.setVerificationStatus(VerificationStatus.UNVERIFIED);
        source.setLastVerifiedDate(null);
        auditService.record("EXTERNAL_RANKING_UPDATED", "RANKING_SOURCE", id, "school=" + source.getSchoolId());
        return toDto(sourceRepository.saveAndFlush(source), publisherCodes());
    }

    @Override
    @Transactional
    public ExternalRankingDto verify(Long id, ExternalRankingVerifyRequest r) {
        if (r.status() == VerificationStatus.UNVERIFIED) {
            throw new BusinessValidationException("status", "choose VERIFIED, DISPUTED or OUTDATED");
        }
        RankingSource source = find(id);
        source.setVerificationStatus(r.status());
        source.setLastVerifiedDate(LocalDate.now(clock));
        String note = InputSanitizer.clean(r.note());
        if (note != null) {
            source.setNotes(note);
        }
        auditService.record("EXTERNAL_RANKING_VERIFIED", "RANKING_SOURCE", id,
                "status=" + r.status() + (note == null ? "" : ", note=" + note));
        return toDto(sourceRepository.saveAndFlush(source), publisherCodes());
    }

    @Override
    @Transactional
    public void delete(Long id) {
        RankingSource source = find(id);
        sourceRepository.delete(source);
        auditService.record("EXTERNAL_RANKING_DELETED", "RANKING_SOURCE", id,
                "school=" + source.getSchoolId() + ", " + source.getPublisher() + " " + source.getRankingName() + " "
                        + source.getRankingYear());
    }

    // --- CSV import ------------------------------------------------------------------------------

    private record Row(Long schoolId, ExternalRankingRequest request, Optional<RankingPublisher> publisher) {
    }

    @Override
    @Transactional
    public CsvImportResult importCsv(InputStream csv, CsvImportService.Mode mode) {
        List<Row> valid = new ArrayList<>();
        List<RowError> errors = new ArrayList<>();
        Set<String> seen = new HashSet<>();
        int total = 0;
        try (Reader reader = new InputStreamReader(csv, StandardCharsets.UTF_8);
             CSVParser parser = CSVFormat.DEFAULT.builder().setHeader().setSkipHeaderRecord(true).setTrim(true)
                     .setIgnoreEmptyLines(true).setIgnoreHeaderCase(true).build().parse(reader)) {
            Map<String, String> headers = new HashMap<>();
            for (String h : parser.getHeaderNames()) {
                headers.put(h.replace("﻿", "").trim().toLowerCase(Locale.ROOT), h);
            }
            List<String> missing = new ArrayList<>();
            if (!headers.containsKey("school_slug") && !headers.containsKey("school_id")) missing.add("school_slug or school_id");
            if (!headers.containsKey("publisher_code") && !headers.containsKey("publisher")) missing.add("publisher_code or publisher");
            for (String required : List.of("ranking_name", "ranking_year", "source_url", "retrieved_date")) {
                if (!headers.containsKey(required)) missing.add(required);
            }
            if (!missing.isEmpty()) {
                throw new BusinessValidationException("file", "missing required columns: " + String.join(", ", missing));
            }
            for (CSVRecord record : parser) {
                total++;
                if (total > MAX_ROWS) {
                    throw new BusinessValidationException("file", "a single import may contain at most " + MAX_ROWS + " rows");
                }
                int row = (int) record.getRecordNumber() + 1; // +1 for the header line
                List<RowError> rowErrors = new ArrayList<>();
                Row parsed = parseRow(record, headers, row, rowErrors);
                if (parsed != null && rowErrors.isEmpty()) {
                    String key = parsed.schoolId() + "|" + publisherName(parsed.request(), parsed.publisher()).toLowerCase(Locale.ROOT)
                            + "|" + parsed.request().rankingName().toLowerCase(Locale.ROOT) + "|" + parsed.request().rankingYear()
                            + "|" + Objects.toString(parsed.request().category(), "").toLowerCase(Locale.ROOT)
                            + "|" + Objects.toString(parsed.request().region(), "").toLowerCase(Locale.ROOT);
                    if (!seen.add(key)) {
                        rowErrors.add(new RowError(row, "ranking_name", "the same school appears twice in this list"));
                    }
                }
                if (rowErrors.isEmpty()) valid.add(parsed);
                else errors.addAll(rowErrors);
            }
        } catch (IOException | IllegalArgumentException | IllegalStateException e) {
            throw new BusinessValidationException("file", "could not parse CSV: " + e.getMessage());
        }

        boolean commit = switch (mode) {
            case VALIDATE_ONLY -> false;
            case ALL_OR_NOTHING -> errors.isEmpty() && !valid.isEmpty();
            case VALID_ROWS_ONLY -> !valid.isEmpty();
        };
        int created = 0;
        int updated = 0;
        int unchanged = 0;
        if (commit) {
            for (Row row : valid) {
                ExternalRankingRequest r = row.request();
                Optional<RankingSource> existing = sourceRepository.findEntry(row.schoolId(), publisherName(r, row.publisher()),
                        r.rankingName(), r.rankingYear(), Objects.requireNonNullElse(r.category(), ""),
                        Objects.requireNonNullElse(r.region(), ""));
                if (existing.isPresent()) {
                    RankingSource s = existing.get();
                    String before = fingerprint(s);
                    apply(s, r, row.publisher());
                    if (before.equals(fingerprint(s))) {
                        unchanged++;
                        continue;
                    }
                    s.setVerificationStatus(VerificationStatus.UNVERIFIED);
                    s.setLastVerifiedDate(null);
                    updated++;
                } else {
                    RankingSource s = new RankingSource();
                    s.setSchoolId(row.schoolId());
                    apply(s, r, row.publisher());
                    sourceRepository.save(s);
                    created++;
                }
            }
            sourceRepository.flush();
            auditService.record("EXTERNAL_RANKING_IMPORT", "RANKING_SOURCE", null, "mode=" + mode + ", rows=" + total
                    + ", created=" + created + ", updated=" + updated + ", unchanged=" + unchanged + ", errors=" + errors.size());
        }
        return new CsvImportResult(mode.name(), total, valid.size(), created, updated, total - created - updated, commit, errors);
    }

    private Row parseRow(CSVRecord record, Map<String, String> headers, int row, List<RowError> errors) {
        Function<String, String> cell = column -> {
            String header = headers.get(column);
            if (header == null || !record.isSet(header)) return null;
            String v = record.get(header);
            return v == null || v.isBlank() ? null : v.trim();
        };
        Long schoolId = null;
        String slug = cell.apply("school_slug");
        String idText = cell.apply("school_id");
        if (idText != null) {
            try {
                schoolId = schoolRepository.existsById(Long.parseLong(idText)) ? Long.parseLong(idText) : null;
            } catch (NumberFormatException e) {
                // reported below
            }
            if (schoolId == null) errors.add(new RowError(row, "school_id", "no school with id " + idText));
        } else if (slug != null) {
            schoolId = schoolRepository.findBySlug(slug.toLowerCase(Locale.ROOT)).map(School::getId).orElse(null);
            if (schoolId == null) errors.add(new RowError(row, "school_slug", "no school with slug " + slug));
        } else {
            errors.add(new RowError(row, "school_slug", "give school_slug or school_id"));
        }
        Integer rank = null;
        String rankText = cell.apply("rank_position");
        if (rankText != null) {
            try {
                rank = Integer.parseInt(rankText.replaceFirst("^#", ""));
            } catch (NumberFormatException e) {
                errors.add(new RowError(row, "rank_position", "must be a whole number (put text such as \"Top 10\" in score_text)"));
            }
        }
        LocalDate retrieved = null;
        String dateText = cell.apply("retrieved_date");
        if (dateText != null) {
            try {
                retrieved = LocalDate.parse(dateText);
            } catch (DateTimeParseException e) {
                errors.add(new RowError(row, "retrieved_date", "use YYYY-MM-DD"));
            }
        }
        RankingScope scope = null;
        String scopeText = cell.apply("scope");
        if (scopeText != null) {
            try {
                scope = RankingScope.valueOf(scopeText.toUpperCase(Locale.ROOT));
            } catch (IllegalArgumentException e) {
                errors.add(new RowError(row, "scope", "use NATIONAL, STATE or CITY"));
            }
        }
        String sponsoredText = cell.apply("sponsored");
        Boolean sponsored = sponsoredText == null ? null
                : Set.of("true", "yes", "y", "1").contains(sponsoredText.toLowerCase(Locale.ROOT));
        ExternalRankingRequest request = new ExternalRankingRequest(cell.apply("publisher"), cell.apply("ranking_name"),
                cell.apply("ranking_year"), cell.apply("category"), rank, cell.apply("score_text"), cell.apply("source_url"),
                retrieved, cell.apply("publisher_code"), scope, cell.apply("region"), sponsored, cell.apply("notes"));
        for (ConstraintViolation<ExternalRankingRequest> v : validator.validate(request)) {
            errors.add(new RowError(row, column(v.getPropertyPath().toString()), v.getMessage()));
        }
        Optional<RankingPublisher> publisher = checkEntry(request, row, errors);
        return new Row(schoolId, clean(request), publisher);
    }

    // --- rules -----------------------------------------------------------------------------------

    /** Rules beyond the field annotations; returns the recorded publisher the entry names, if any. */
    private Optional<RankingPublisher> checkEntry(ExternalRankingRequest r, int row, List<RowError> errors) {
        Optional<RankingPublisher> publisher = Optional.empty();
        String code = blankToNull(r.publisherCode());
        if (code != null) {
            publisher = publisherRepository.findByCodeIgnoreCase(code);
            if (publisher.isEmpty()) errors.add(new RowError(row, "publisherCode", "no recorded publisher with code " + code));
        } else if (InputSanitizer.clean(r.publisher()) == null) {
            errors.add(new RowError(row, "publisher", "give the publisher's code or name"));
        } else {
            publisher = publisherRepository.findByNameIgnoreCase(InputSanitizer.clean(r.publisher()));
        }
        if (r.rankingYear() != null && !YEAR.matcher(r.rankingYear().trim()).matches()) {
            errors.add(new RowError(row, "rankingYear", "use the edition year as the publisher gives it, e.g. 2025 or 2025-26"));
        }
        RankingScope scope = r.scope() == null ? RankingScope.NATIONAL : r.scope();
        if (scope != RankingScope.NATIONAL && InputSanitizer.clean(r.region()) == null) {
            errors.add(new RowError(row, "region", "name the state or city this " + scope.name().toLowerCase(Locale.ROOT) + " ranking covers"));
        }
        if (Boolean.TRUE.equals(r.sponsored()) && r.rankPosition() != null) {
            errors.add(new RowError(row, "rankPosition", "a sponsored or featured listing is not a ranking position; leave it empty"));
        }
        boolean rankAlreadyReported = errors.stream().anyMatch(e -> e.row() == row && e.field().equals("rank_position"));
        if (r.rankPosition() == null && InputSanitizer.clean(r.scoreText()) == null && !Boolean.TRUE.equals(r.sponsored())
                && !rankAlreadyReported) {
            errors.add(new RowError(row, "rankPosition", "give the rank position or the publisher's wording in scoreText"));
        }
        if (r.retrievedDate() != null && r.retrievedDate().isAfter(LocalDate.now(clock))) {
            errors.add(new RowError(row, "retrievedDate", "cannot be in the future"));
        }
        return publisher;
    }

    private static void throwIfAny(List<RowError> errors) {
        if (!errors.isEmpty()) {
            throw new BusinessValidationException("Validation failed", errors.stream()
                    .map(e -> new com.indiaschoolfinder.dto.common.ApiError.FieldViolation(e.field(), e.message())).toList());
        }
    }

    private static void apply(RankingSource s, ExternalRankingRequest r, Optional<RankingPublisher> publisher) {
        s.setPublisherId(publisher.map(RankingPublisher::getId).orElse(null));
        s.setPublisher(publisherName(r, publisher));
        s.setRankingName(InputSanitizer.clean(r.rankingName()));
        s.setRankingYear(r.rankingYear().trim());
        s.setCategory(InputSanitizer.clean(r.category()));
        s.setRankPosition(r.rankPosition());
        s.setScoreText(InputSanitizer.clean(r.scoreText()));
        s.setSourceUrl(r.sourceUrl().trim());
        s.setRetrievedDate(r.retrievedDate());
        s.setScope(r.scope() == null ? RankingScope.NATIONAL : r.scope());
        s.setRegion(s.getScope() == RankingScope.NATIONAL ? null : InputSanitizer.clean(r.region()));
        s.setSponsored(Boolean.TRUE.equals(r.sponsored()));
        s.setNotes(InputSanitizer.clean(r.notes()));
    }

    private static String publisherName(ExternalRankingRequest r, Optional<RankingPublisher> publisher) {
        return publisher.map(RankingPublisher::getName).orElseGet(() -> InputSanitizer.clean(r.publisher()));
    }

    private static ExternalRankingRequest clean(ExternalRankingRequest r) {
        return new ExternalRankingRequest(InputSanitizer.clean(r.publisher()), InputSanitizer.clean(r.rankingName()),
                r.rankingYear(), InputSanitizer.clean(r.category()), r.rankPosition(), InputSanitizer.clean(r.scoreText()),
                r.sourceUrl(), r.retrievedDate(), r.publisherCode(), r.scope(),
                r.scope() == null || r.scope() == RankingScope.NATIONAL ? null : InputSanitizer.clean(r.region()),
                r.sponsored(), InputSanitizer.clean(r.notes()));
    }

    /** Everything an editor checks; a re-import that changes none of it keeps the verification. */
    private static String fingerprint(RankingSource s) {
        return String.join("|", Objects.toString(s.getRankPosition()), Objects.toString(s.getScoreText()), s.getSourceUrl(),
                s.getScope().name(), Objects.toString(s.getRegion()), String.valueOf(s.isSponsored()),
                Objects.toString(s.getPublisherId()), Objects.toString(s.getNotes()));
    }

    /** "rankPosition" → "rank_position" so CSV errors name the column. */
    private static String column(String property) {
        return property.replaceAll("([A-Z])", "_$1").toLowerCase(Locale.ROOT);
    }

    private RankingSource find(Long id) {
        return sourceRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("External ranking", id));
    }

    private Map<Long, String> publisherCodes() {
        return publisherRepository.findAll().stream().collect(Collectors.toMap(RankingPublisher::getId, RankingPublisher::getCode));
    }

    static ExternalRankingDto toDto(RankingSource s, Map<Long, String> codes) {
        return new ExternalRankingDto(s.getId(), s.getPublisher(), s.getRankingName(), s.getRankingYear(), s.getCategory(),
                s.getRankPosition(), s.getScoreText(), s.getSourceUrl(), s.getRetrievedDate(), s.getVerificationStatus(),
                s.getPublisherId() == null ? null : codes.get(s.getPublisherId()), s.getScope(), s.getRegion(),
                s.isSponsored(), s.getNotes(), s.getLastVerifiedDate());
    }

    private static RankingPublisherDto toDto(RankingPublisher p, long verifiedEntries) {
        return new RankingPublisherDto(p.getId(), p.getCode(), p.getName(), p.getKind(), p.getWebsiteUrl(),
                p.getMethodologyUrl(), p.getDescription(), p.isActive(), verifiedEntries);
    }

    private static String blankToNull(String v) {
        return v == null || v.isBlank() ? null : v.trim();
    }
}
