package com.indiaschoolfinder.service.impl;

import com.indiaschoolfinder.dto.admin.CsvImportResult;
import com.indiaschoolfinder.dto.admin.CsvImportResult.RowError;
import com.indiaschoolfinder.dto.school.BoardingProfileRequest;
import com.indiaschoolfinder.dto.school.FacilityRequest;
import com.indiaschoolfinder.dto.school.SchoolRequest;
import com.indiaschoolfinder.entity.School;
import com.indiaschoolfinder.enums.BoardingType;
import com.indiaschoolfinder.enums.EntranceExam;
import com.indiaschoolfinder.enums.FacilityCategory;
import com.indiaschoolfinder.enums.ResidentialSystem;
import com.indiaschoolfinder.enums.GenderType;
import com.indiaschoolfinder.enums.SchoolManagement;
import com.indiaschoolfinder.enums.SchoolNetwork;
import com.indiaschoolfinder.enums.SchoolType;
import com.indiaschoolfinder.enums.VerificationStatus;
import com.indiaschoolfinder.exception.BusinessValidationException;
import com.indiaschoolfinder.repository.EducationBoardRepository;
import com.indiaschoolfinder.repository.SchoolClassRepository;
import com.indiaschoolfinder.repository.SchoolFacilityRepository;
import com.indiaschoolfinder.repository.SchoolRepository;
import com.indiaschoolfinder.service.AuditService;
import com.indiaschoolfinder.service.BoardingService;
import com.indiaschoolfinder.service.CsvImportService;
import com.indiaschoolfinder.service.LocationService;
import com.indiaschoolfinder.service.SchoolService;
import com.indiaschoolfinder.validation.HttpUrlValidator;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validator;
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVParser;
import org.apache.commons.csv.CSVPrinter;
import org.apache.commons.csv.CSVRecord;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.Reader;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Validated bulk import of school profiles.
 *
 * <p>Columns (header row required, case-insensitive): name, school_type, state_code (ISO code such as UP,
 * or the full state/UT name; a column named "state" is also accepted), district, city, management, network,
 * udise_code, affiliation_number, board_code, class_codes (";"-separated, e.g. NURSERY;KG;I),
 * medium_of_instruction, gender_type, website_url, admission_portal_url, phone, email, address_line, locality,
 * pin_code, latitude, longitude, school_timings, established_year, has_transport, has_hostel,
 * accessibility_features, description, source_url, source_retrieved_date (yyyy-MM-dd),
 * facilities ("CATEGORY:Name;CATEGORY:Name"), facilities_source_url (defaults to source_url), and the optional boarding
 * profile columns described at {@link #parseBoarding}.
 * Blank cells are stored as unknown (NULL). A district named for the first time is created.
 *
 * <p>Duplicates: a row matches an existing school by UDISE code, else by name + PIN code within the state.
 */
@Service
public class CsvImportServiceImpl implements CsvImportService {

    static final int MAX_ROWS = 5000;
    private static final Set<String> REQUIRED = Set.of("name", "school_type", "source_url");

    private final SchoolService schoolService;
    private final SchoolRepository schoolRepository;
    private final SchoolFacilityRepository facilityRepository;
    private final EducationBoardRepository boardRepository;
    private final SchoolClassRepository classRepository;
    private final AuditService auditService;
    private final Validator validator;
    private final LocationService locationService;
    private final ObjectMapper objectMapper;
    private final BoardingService boardingService;
    private final com.indiaschoolfinder.service.ProfileScoreService profileScoreService;

    public CsvImportServiceImpl(SchoolService schoolService, SchoolRepository schoolRepository,
                                SchoolFacilityRepository facilityRepository, EducationBoardRepository boardRepository,
                                SchoolClassRepository classRepository, AuditService auditService, Validator validator,
                                LocationService locationService, ObjectMapper objectMapper, BoardingService boardingService,
                                com.indiaschoolfinder.service.ProfileScoreService profileScoreService) {
        this.profileScoreService = profileScoreService;
        this.boardingService = boardingService;
        this.objectMapper = objectMapper;
        this.locationService = locationService;
        this.schoolService = schoolService;
        this.schoolRepository = schoolRepository;
        this.facilityRepository = facilityRepository;
        this.boardRepository = boardRepository;
        this.classRepository = classRepository;
        this.auditService = auditService;
        this.validator = validator;
    }

    private record ParsedRow(int rowNumber, SchoolRequest request, List<FacilityRequest> facilities, Optional<School> existing,
                             BoardingProfileRequest boarding) {
    }

    @Override
    @Transactional
    public CsvImportResult importSchools(InputStream csv, Mode mode, boolean updateExisting) {
        List<RowError> errors = new ArrayList<>();
        List<ParsedRow> valid = new ArrayList<>();
        int total = 0;

        Set<String> boardCodes = boardRepository.findAll().stream().map(b -> b.getCode()).collect(Collectors.toSet());
        Set<String> classCodes = classRepository.findAll().stream().map(c -> c.getCode()).collect(Collectors.toSet());
        Set<String> seenKeys = new HashSet<>();

        try (Reader reader = new InputStreamReader(csv, StandardCharsets.UTF_8);
             CSVParser parser = CSVFormat.DEFAULT.builder()
                     .setHeader().setSkipHeaderRecord(true).setTrim(true).setIgnoreEmptyLines(true)
                     .setIgnoreHeaderCase(true).build().parse(reader)) {

            Set<String> headers = parser.getHeaderNames().stream()
                    .map(h -> h.replace("﻿", "").trim().toLowerCase(Locale.ROOT)).collect(Collectors.toSet());
            Set<String> missingHeaders = new HashSet<>(REQUIRED);
            missingHeaders.removeAll(headers);
            if (!headers.contains("state_code") && !headers.contains("state")) {
                missingHeaders.add("state_code");
            }
            if (!missingHeaders.isEmpty()) {
                throw new BusinessValidationException("file", "missing required columns: " + String.join(", ", missingHeaders));
            }
            Map<String, String> headerMap = new HashMap<>();
            for (String h : parser.getHeaderNames()) {
                headerMap.put(h.replace("﻿", "").trim().toLowerCase(Locale.ROOT), h);
            }

            for (CSVRecord record : parser) {
                total++;
                if (total > MAX_ROWS) {
                    throw new BusinessValidationException("file", "a single import may contain at most " + MAX_ROWS + " rows");
                }
                int rowNumber = (int) record.getRecordNumber() + 1; // +1 for the header line
                List<RowError> rowErrors = new ArrayList<>();
                Cells cells = new Cells(record, headerMap, rowNumber, rowErrors);
                ParsedRow parsed = parseRow(cells, rowNumber, rowErrors, boardCodes, classCodes, seenKeys, updateExisting);
                if (rowErrors.isEmpty()) {
                    valid.add(parsed);
                } else {
                    errors.addAll(rowErrors);
                }
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
        if (commit) {
            for (ParsedRow row : valid) {
                Long schoolId;
                if (row.existing().isPresent()) {
                    schoolId = schoolService.update(row.existing().get().getId(), row.request(), null).id();
                    updated++;
                } else {
                    schoolId = schoolService.create(row.request()).id();
                    created++;
                }
                for (FacilityRequest facility : row.facilities()) {
                    if (!facilityRepository.existsBySchoolIdAndCategoryAndNameIgnoreCase(schoolId, facility.category(), facility.name())) {
                        schoolService.addFacility(schoolId, facility);
                    }
                }
                if (row.boarding() != null) {
                    boardingService.upsert(schoolId, row.boarding());
                }
            }
            auditService.record("CSV_IMPORT", "SCHOOL", null,
                    "mode=" + mode + ", rows=" + total + ", created=" + created + ", updated=" + updated + ", errors=" + errors.size());
            schoolRepository.flush();
            profileScoreService.recompute(); // imported facts change the recommended order
        }
        int skipped = total - created - updated;
        return new CsvImportResult(mode.name(), total, valid.size(), created, updated, skipped, commit, errors);
    }

    @Override
    @Transactional
    public CsvImportResult importJson(InputStream json, Mode mode, boolean updateExisting) {
        JsonNode root;
        try {
            root = objectMapper.readTree(json);
        } catch (IOException e) {
            String reason = e instanceof com.fasterxml.jackson.core.JsonProcessingException j ? j.getOriginalMessage() : e.getMessage();
            throw new BusinessValidationException("file", "could not parse JSON: " + reason);
        }
        JsonNode records = root != null && root.isObject() && root.has("schools") ? root.get("schools") : root;
        if (records == null || !records.isArray()) {
            throw new BusinessValidationException("file", "expected a JSON array of schools or {\"schools\": [...]}");
        }
        if (records.size() > MAX_ROWS) {
            throw new BusinessValidationException("file", "a single import may contain at most " + MAX_ROWS + " rows");
        }
        // Union of keys, in first-seen order, becomes the CSV header; the CSV path then applies every rule.
        Set<String> columns = new LinkedHashSet<>();
        for (JsonNode r : records) {
            if (!r.isObject()) {
                throw new BusinessValidationException("file", "every school must be a JSON object");
            }
            r.fieldNames().forEachRemaining(columns::add);
        }
        StringBuilder out = new StringBuilder();
        try (CSVPrinter printer = new CSVPrinter(out, CSVFormat.DEFAULT.builder().setHeader(columns.toArray(String[]::new)).build())) {
            for (JsonNode r : records) {
                List<String> cells = new ArrayList<>(columns.size());
                for (String column : columns) {
                    cells.add(jsonCell(r.get(column), column));
                }
                printer.printRecord(cells);
            }
        } catch (IOException e) {
            throw new BusinessValidationException("file", "could not convert JSON: " + e.getMessage());
        }
        CsvImportResult result = importSchools(new java.io.ByteArrayInputStream(out.toString().getBytes(StandardCharsets.UTF_8)),
                mode, updateExisting);
        // CSV rows count the header line; JSON users think in record positions (first school = 1).
        List<RowError> errors = result.errors().stream()
                .map(e -> new RowError(e.row() - 1, e.field(), e.message())).toList();
        return new CsvImportResult(result.mode(), result.totalRows(), result.validRows(), result.created(), result.updated(),
                result.skipped(), result.committed(), errors);
    }

    private static String jsonCell(JsonNode value, String column) {
        if (value == null || value.isNull()) {
            return "";
        }
        if (value.isArray()) {
            List<String> parts = new ArrayList<>();
            value.forEach(v -> parts.add(v.asText()));
            return String.join(";", parts);
        }
        if (value.isObject()) {
            throw new BusinessValidationException(column, "'" + column + "' must be a text, number, boolean or list value");
        }
        return value.asText();
    }

    private ParsedRow parseRow(Cells c, int rowNumber, List<RowError> errors, Set<String> boardCodes, Set<String> classCodes,
                               Set<String> seenKeys, boolean updateExisting) {
        String board = upper(c.get("board_code"));
        if (board != null && !boardCodes.contains(board)) {
            errors.add(new RowError(rowNumber, "board_code", "unknown board code '" + board + "' (allowed: "
                    + String.join(", ", boardCodes.stream().sorted().toList()) + ")"));
        }
        List<String> classes = splitList(c.get("class_codes")).stream().map(s -> s.toUpperCase(Locale.ROOT)).toList();
        for (String code : classes) {
            if (!classCodes.contains(code)) {
                errors.add(new RowError(rowNumber, "class_codes", "unknown class code '" + code + "'"));
            }
        }

        String stateColumn = c.get("state_code") != null ? "state_code" : "state";
        String stateCode = locationService.findStateCode(c.get(stateColumn)).orElse(null);
        if (c.get(stateColumn) == null) {
            errors.add(new RowError(rowNumber, "state_code", "a state or union territory is required"));
        } else if (stateCode == null) {
            errors.add(new RowError(rowNumber, stateColumn, "unknown state/UT '" + c.get(stateColumn)
                    + "' (use an ISO code such as UP or the full name)"));
        }

        SchoolRequest request = new SchoolRequest(
                // Names built from postal addresses carry stray punctuation; tidying keeps re-imports clean (V14).
                com.indiaschoolfinder.util.SchoolNames.tidy(c.get("name")), c.get("description"), c.enumValue("school_type", SchoolType.class),
                c.enumValue("management", SchoolManagement.class), c.enumValue("network", SchoolNetwork.class), board,
                c.get("affiliation_number"), c.get("udise_code"), c.get("principal_name"), c.get("managing_body"),
                c.enumValue("gender_type", GenderType.class), c.get("medium_of_instruction"), classes,
                c.get("website_url"), c.get("admission_portal_url"), c.get("phone"), lower(c.get("email")),
                c.get("address_line"), c.get("locality"), c.get("city"), c.get("district"),
                stateCode == null ? c.get(stateColumn) : stateCode, c.get("pin_code"),
                c.doubleValue("latitude"), c.doubleValue("longitude"), null, c.get("school_timings"),
                c.intValue("established_year"), c.boolValue("has_transport"), c.boolValue("has_hostel"),
                c.get("accessibility_features"), null, c.get("source_url"), c.dateValue("source_retrieved_date"));

        for (ConstraintViolation<SchoolRequest> v : validator.validate(request)) {
            if (!"stateCode".equals(v.getPropertyPath().toString())) { // already reported above
                errors.add(new RowError(rowNumber, toColumn(v.getPropertyPath().toString()), v.getMessage()));
            }
        }

        String facilitiesSource = c.get("facilities_source_url") != null ? c.get("facilities_source_url") : request.sourceUrl();
        if (c.get("facilities") != null && !HttpUrlValidator.isValid(facilitiesSource)) {
            errors.add(new RowError(rowNumber, "facilities_source_url", "must be a valid http(s) URL"));
        }
        List<FacilityRequest> facilities = new ArrayList<>();
        for (String item : splitList(c.get("facilities"))) {
            int colon = item.indexOf(':');
            if (colon <= 0 || colon == item.length() - 1) {
                errors.add(new RowError(rowNumber, "facilities", "expected CATEGORY:Name but got '" + item + "'"));
                continue;
            }
            String category = item.substring(0, colon).trim().toUpperCase(Locale.ROOT);
            String name = item.substring(colon + 1).trim();
            try {
                facilities.add(new FacilityRequest(FacilityCategory.valueOf(category), name, null, true, facilitiesSource));
            } catch (IllegalArgumentException e) {
                errors.add(new RowError(rowNumber, "facilities", "unknown facility category '" + category + "' (allowed: "
                        + Arrays.stream(FacilityCategory.values()).map(Enum::name).collect(Collectors.joining(", ")) + ")"));
            }
        }

        BoardingProfileRequest boarding = parseBoarding(c, rowNumber, errors, request.sourceUrl());

        Optional<School> existing = Optional.empty();
        String udise = request.udiseCode();
        String affiliation = board == null || request.affiliationNumber() == null ? null : request.affiliationNumber().trim();
        if (request.name() != null && !request.name().isBlank() && stateCode != null) {
            String name = request.name().trim();
            String key = udise != null ? "udise|" + udise
                    : affiliation != null ? "aff|" + board + "|" + affiliation
                    : stateCode + "|" + name.toLowerCase(Locale.ROOT) + "|" + (request.pinCode() == null ? "" : request.pinCode());
            if (!seenKeys.add(key)) {
                errors.add(new RowError(rowNumber, udise != null ? "udise_code" : affiliation != null ? "affiliation_number" : "name",
                        udise != null ? "duplicate of an earlier row in this file (same UDISE code)"
                        : affiliation != null ? "duplicate of an earlier row in this file (same board affiliation number)"
                        : "duplicate of an earlier row in this file (same name, PIN code and state)"));
            }
            // UDISE code first, then board + affiliation number; otherwise (or if no school has them yet) the same
            // name + PIN in the same state among records without identifiers, so an import can attach them.
            existing = udise == null ? Optional.empty() : schoolRepository.findByUdiseCode(udise);
            if (existing.isEmpty() && affiliation != null) {
                existing = schoolRepository.findByEducationBoardCodeAndAffiliationNumber(board, affiliation);
            }
            if (existing.isEmpty()) {
                existing = schoolRepository.findDuplicate(name, request.pinCode(), stateCode);
            }
            if (existing.isPresent() && !updateExisting) {
                errors.add(new RowError(rowNumber, "name", "school already exists (id " + existing.get().getId()
                        + "); re-run with updateExisting=true to update it"));
            } else if (existing.isPresent() && existing.get().getVerificationStatus() == VerificationStatus.VERIFIED) {
                // A file is never better evidence than a record a person has checked against the source.
                errors.add(new RowError(rowNumber, "name", "school " + existing.get().getId() + " is verified (last "
                        + existing.get().getLastVerifiedDate() + "); edit it in the admin editor instead of overwriting it"));
            }
        }
        return new ParsedRow(rowNumber, request, facilities, existing, boarding);
    }

    /**
     * Boarding columns: residential_system (required for a profile), boarding_type (blank = not stated), entrance_exam, entry_classes,
     * boarding_summary, accommodation, pastoral_care, dining, medical_care, nearest_transport, academic_session,
     * boarding_source_url (defaults to source_url). Returns null when the row has no boarding columns.
     */
    private BoardingProfileRequest parseBoarding(Cells c, int rowNumber, List<RowError> errors, String defaultSource) {
        boolean any = java.util.stream.Stream.of("boarding_type", "residential_system", "entrance_exam", "entry_classes",
                "boarding_summary", "accommodation", "pastoral_care", "dining", "medical_care", "nearest_transport",
                "academic_session", "boarding_source_url").anyMatch(col -> c.get(col) != null);
        if (!any) {
            return null;
        }
        BoardingProfileRequest b = new BoardingProfileRequest(
                c.enumValue("boarding_type", BoardingType.class), c.enumValue("residential_system", ResidentialSystem.class),
                c.enumValue("entrance_exam", EntranceExam.class), c.get("entry_classes"), c.get("boarding_summary"),
                c.get("accommodation"), c.get("pastoral_care"), c.get("dining"), c.get("medical_care"),
                c.get("nearest_transport"), c.get("academic_session"),
                c.get("boarding_source_url") != null ? c.get("boarding_source_url") : defaultSource);
        for (ConstraintViolation<BoardingProfileRequest> v : validator.validate(b)) {
            String property = v.getPropertyPath().toString();
            String column = switch (property) {
                case "summary" -> "boarding_summary";
                case "sourceUrl" -> "boarding_source_url";
                default -> toColumn(property);
            };
            // A missing enum may already have been reported by the cell parser.
            if (errors.stream().noneMatch(e -> e.row() == rowNumber && e.field().equals(column))) {
                errors.add(new RowError(rowNumber, column, v.getMessage()));
            }
        }
        return b;
    }

    /** "classCodes[0].&lt;list element&gt;" → "class_codes", "sourceUrl" → "source_url". */
    static String toColumn(String property) {
        String root = property.split("[\\[.]", 2)[0];
        return root.replaceAll("([a-z])([A-Z])", "$1_$2").toLowerCase(Locale.ROOT);
    }

    private static List<String> splitList(String value) {
        if (value == null) {
            return List.of();
        }
        return Arrays.stream(value.split("[;|]")).map(String::trim).filter(s -> !s.isEmpty()).toList();
    }

    private static String upper(String s) {
        return s == null ? null : s.toUpperCase(Locale.ROOT);
    }

    private static String lower(String s) {
        return s == null ? null : s.toLowerCase(Locale.ROOT);
    }

    /** Typed cell access; parse problems are recorded as row errors and yield null. */
    private static final class Cells {
        private final CSVRecord record;
        private final Map<String, String> headerMap;
        private final int row;
        private final List<RowError> errors;

        Cells(CSVRecord record, Map<String, String> headerMap, int row, List<RowError> errors) {
            this.record = record;
            this.headerMap = headerMap;
            this.row = row;
            this.errors = errors;
        }

        String get(String column) {
            String header = headerMap.get(column);
            if (header == null || !record.isSet(header)) {
                return null;
            }
            String value = record.get(header);
            return value == null || value.isBlank() ? null : value.trim();
        }

        <E extends Enum<E>> E enumValue(String column, Class<E> type) {
            String v = get(column);
            if (v == null) {
                return null;
            }
            try {
                return Enum.valueOf(type, v.toUpperCase(Locale.ROOT).replace('-', '_').replace(' ', '_'));
            } catch (IllegalArgumentException e) {
                errors.add(new RowError(row, column, "invalid value '" + v + "' (allowed: "
                        + Arrays.stream(type.getEnumConstants()).map(Enum::name).collect(Collectors.joining(", ")) + ")"));
                return null;
            }
        }

        Double doubleValue(String column) {
            String v = get(column);
            if (v == null) {
                return null;
            }
            try {
                return new BigDecimal(v).doubleValue();
            } catch (NumberFormatException e) {
                errors.add(new RowError(row, column, "not a number: '" + v + "'"));
                return null;
            }
        }

        Integer intValue(String column) {
            String v = get(column);
            if (v == null) {
                return null;
            }
            try {
                return Integer.valueOf(v);
            } catch (NumberFormatException e) {
                errors.add(new RowError(row, column, "not a whole number: '" + v + "'"));
                return null;
            }
        }

        Boolean boolValue(String column) {
            String v = get(column);
            if (v == null) {
                return null;
            }
            return switch (v.toLowerCase(Locale.ROOT)) {
                case "true", "yes", "y", "1" -> true;
                case "false", "no", "n", "0" -> false;
                default -> {
                    errors.add(new RowError(row, column, "expected yes/no but got '" + v + "'"));
                    yield null;
                }
            };
        }

        LocalDate dateValue(String column) {
            String v = get(column);
            if (v == null) {
                return null;
            }
            try {
                return LocalDate.parse(v);
            } catch (DateTimeParseException e) {
                errors.add(new RowError(row, column, "expected a date like 2026-10-23 but got '" + v + "'"));
                return null;
            }
        }
    }
}
