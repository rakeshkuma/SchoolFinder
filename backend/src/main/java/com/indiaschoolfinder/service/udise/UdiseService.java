package com.indiaschoolfinder.service.udise;

import com.indiaschoolfinder.entity.School;
import com.indiaschoolfinder.exception.BusinessValidationException;
import com.indiaschoolfinder.exception.DuplicateResourceException;
import com.indiaschoolfinder.exception.ResourceNotFoundException;
import com.indiaschoolfinder.repository.SchoolRepository;
import com.indiaschoolfinder.service.AuditService;
import com.indiaschoolfinder.util.UdiseLinks;
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVParser;
import org.apache.commons.csv.CSVRecord;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

import java.io.IOException;
import java.io.Reader;
import java.time.Clock;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;

/**
 * UDISE+ details on school profiles: an editor's checked code and Know Your School link for one school, and the matching
 * of an official school list against the directory (a dry run by default; when applied, only unambiguous matches are
 * written, in small batches, and only to schools without a code).
 */
@Service
public class UdiseService {

    /** Rows read from one file at most (a state's list fits; a national file should be split by state). */
    static final int MAX_ROWS = 200_000;
    static final int BATCH = 500;

    private static final Map<String, List<String>> COLUMNS = Map.of(
            "code", List.of("udise_code", "udise", "udise_sch_code", "udisecode", "school_code", "udise code"),
            "name", List.of("school_name", "name", "school name", "schname", "sch_name"),
            "state", List.of("state", "state_name", "state name", "state_code", "statename"),
            "pin", List.of("pincode", "pin_code", "pin", "pin code"),
            "district", List.of("district", "district_name", "district name", "distname"));

    private final SchoolRepository schools;
    private final JdbcTemplate jdbc;
    private final AuditService audit;
    private final TransactionTemplate tx;
    private final Clock clock;

    public UdiseService(SchoolRepository schools, JdbcTemplate jdbc, AuditService audit, TransactionTemplate tx, Clock clock) {
        this.schools = schools;
        this.jdbc = jdbc;
        this.audit = audit;
        this.tx = tx;
        this.clock = clock;
    }

    public record LinkRequest(String udiseCode, String profileUrl, boolean checked) {
    }

    public record LinkResult(long schoolId, String udiseCode, String profileUrl, LocalDate verifiedOn, String matchStatus) {
    }

    /**
     * An editor's checked UDISE details for one school. Both values are optional; setting either requires the editor to
     * confirm they opened the portal and the page shows this school. Clearing both removes the details.
     */
    @Transactional
    public LinkResult setLink(long schoolId, LinkRequest r) {
        School s = schools.findById(schoolId).orElseThrow(() -> new ResourceNotFoundException("School", schoolId));
        String code = blank(r.udiseCode());
        String url = blank(r.profileUrl());
        if (code != null && !UdiseLinks.isCode(code)) {
            throw new BusinessValidationException("udiseCode", "must be the school's 11-digit UDISE+ code");
        }
        if (url != null && !UdiseLinks.isProfileUrl(url)) {
            throw new BusinessValidationException("profileUrl",
                    "must be a Know Your School page, e.g. https://kys.udiseplus.gov.in/#/schooldetail/2823379086/11, copied from the portal");
        }
        if ((code != null || url != null) && !r.checked()) {
            throw new BusinessValidationException("checked", "confirm that you opened the portal and the page shows this school");
        }
        if (code != null) {
            Optional<School> holder = schools.findByUdiseCode(code);
            if (holder.isPresent() && !holder.get().getId().equals(schoolId)) {
                throw new DuplicateResourceException("UDISE+ code " + code + " already belongs to school #" + holder.get().getId());
            }
        }
        s.setUdiseCode(code);
        s.setUdiseProfileUrl(url);
        boolean any = code != null || url != null;
        s.setUdiseVerifiedOn(any ? LocalDate.now(clock) : null);
        s.setUdiseMatchStatus(any ? UdiseLinks.VERIFIED_MATCH : null);
        schools.saveAndFlush(s);
        audit.record(any ? "SCHOOL_UDISE_CHECKED" : "SCHOOL_UDISE_CLEARED", "SCHOOL", schoolId,
                "code " + (code == null ? "-" : code) + ", link " + (url == null ? "-" : url));
        return new LinkResult(schoolId, code, url, s.getUdiseVerifiedOn(), s.getUdiseMatchStatus());
    }

    // --- matching an official list ------------------------------------------------------------------------------------

    public record ReportRow(long schoolId, String schoolName, String stateCode, String pinCode, String status, String udiseCode,
                            String reason, List<Map<String, Object>> candidates) {
    }

    public record MatchReport(boolean applied, int rowsRead, int rowsInvalid, int rowsInOtherStatesOrUnknown, int directorySchools,
                              int verifiedMatches, int pendingReview, int alreadySet, int notMatched, int written,
                              List<ReportRow> verified, List<ReportRow> pending, List<String> problems) {
    }

    /**
     * Matches an official list (CSV with a header: UDISE code, school name, state, PIN code, optionally district) against
     * the directory. With {@code apply} false nothing is written. With {@code apply} true, unambiguous matches get their
     * code (only schools without one), and possible matches are marked PENDING_REVIEW; rows are written in batches of
     * {@value #BATCH}, each batch in its own transaction, so a run can be repeated safely.
     */
    public MatchReport match(Reader csv, boolean apply) throws IOException {
        Map<String, String> states = new HashMap<>();
        jdbc.query("SELECT code, name FROM state", rs -> {
            states.put(rs.getString(1).toLowerCase(Locale.ROOT), rs.getString(1));
            states.put(rs.getString(2).toLowerCase(Locale.ROOT).replace("&", "and"), rs.getString(1));
        });
        List<UdiseMatcher.Row> rows = new ArrayList<>();
        List<String> problems = new ArrayList<>();
        int invalid = 0;
        int unknownState = 0;
        try (CSVParser parser = CSVFormat.DEFAULT.builder().setHeader().setSkipHeaderRecord(true).setIgnoreHeaderCase(true)
                .setTrim(true).setIgnoreEmptyLines(true).build().parse(csv)) {
            Map<String, String> col = columns(parser.getHeaderNames());
            for (String need : List.of("code", "name", "state", "pin")) {
                if (!col.containsKey(need)) {
                    throw new BusinessValidationException("file", "the file needs a column for " + need + " (found: " + parser.getHeaderNames() + ")");
                }
            }
            for (CSVRecord rec : parser) {
                if (rows.size() + invalid >= MAX_ROWS) {
                    problems.add("Stopped after " + MAX_ROWS + " rows: split the file by state.");
                    break;
                }
                String code = rec.get(col.get("code")).replaceAll("\\s", "");
                String name = rec.get(col.get("name"));
                String pin = rec.get(col.get("pin")).replaceAll("\\D", "");
                String state = states.get(rec.get(col.get("state")).toLowerCase(Locale.ROOT).replace("&", "and").trim());
                if (!UdiseLinks.isCode(code) || name.isBlank() || pin.length() != 6) {
                    invalid++;
                    if (problems.size() < 20) {
                        problems.add("Line " + rec.getRecordNumber() + ": needs an 11-digit code, a name and a 6-digit PIN");
                    }
                    continue;
                }
                if (state == null) {
                    unknownState++;
                    continue;
                }
                String district = col.containsKey("district") ? rec.get(col.get("district")) : null;
                rows.add(new UdiseMatcher.Row((int) rec.getRecordNumber(), code, name, state, pin, district));
            }
        }
        List<UdiseMatcher.School> directory = jdbc.query("""
                SELECT s.id, s.name, s.state_code, s.pin_code, d.name AS district, s.udise_code
                FROM school s LEFT JOIN district d ON d.id = s.district_id WHERE s.active""",
                (rs, i) -> new UdiseMatcher.School(rs.getLong(1), rs.getString(2), rs.getString(3), rs.getString(4), rs.getString(5), rs.getString(6)));
        Map<String, Long> codesInUse = new HashMap<>();
        directory.stream().filter(s -> s.udiseCode() != null).forEach(s -> codesInUse.put(s.udiseCode(), s.id()));
        List<UdiseMatcher.Result> results = UdiseMatcher.match(UdiseMatcher.index(directory), rows, codesInUse);

        List<ReportRow> verified = new ArrayList<>();
        List<ReportRow> pending = new ArrayList<>();
        int already = 0;
        Map<String, Long> claimed = new HashMap<>();
        for (UdiseMatcher.Result r : results) {
            ReportRow row = report(r);
            switch (r.status()) {
                case "VERIFIED_MATCH" -> {
                    // Two directory schools must never receive one code.
                    if (claimed.putIfAbsent(r.udiseCode(), r.school().id()) == null) {
                        verified.add(row);
                    } else {
                        pending.add(new ReportRow(row.schoolId(), row.schoolName(), row.stateCode(), row.pinCode(), "PENDING_REVIEW", null,
                                "code also matched to school #" + claimed.get(r.udiseCode()), row.candidates()));
                    }
                }
                case "ALREADY_SET" -> already++;
                default -> pending.add(row);
            }
        }
        java.util.Set<String> fileStates = new java.util.HashSet<>();
        rows.forEach(r -> fileStates.add(r.stateCode()));
        long statesInFile = fileStates.size();
        // Directory schools the file could have matched: those in the states it covers.
        int inScope = (int) directory.stream().filter(s -> fileStates.contains(s.stateCode())).count();
        int notMatched = Math.max(0, inScope - verified.size() - pending.size() - already);
        int written = apply ? write(verified, pending) : 0;
        if (apply) {
            audit.record("SCHOOL_UDISE_IMPORT", "SCHOOL", null, "rows " + rows.size() + ", states " + statesInFile + ", verified "
                    + verified.size() + ", pending " + pending.size() + ", written " + written);
        }
        return new MatchReport(apply, rows.size() + invalid + unknownState, invalid, unknownState, inScope, verified.size(), pending.size(),
                already, notMatched, written, verified, pending, problems);
    }

    /** Writes in batches; each statement only touches a school still without a code, so repeating a run changes nothing. */
    private int write(List<ReportRow> verified, List<ReportRow> pending) {
        LocalDate today = LocalDate.now(clock);
        int written = 0;
        for (int i = 0; i < verified.size(); i += BATCH) {
            List<ReportRow> batch = verified.subList(i, Math.min(verified.size(), i + BATCH));
            Integer n = tx.execute(st -> batch.stream().mapToInt(r -> jdbc.update("""
                    UPDATE school SET udise_code = ?, udise_match_status = 'VERIFIED_MATCH', udise_verified_on = ?
                    WHERE id = ? AND udise_code IS NULL
                      AND NOT EXISTS (SELECT 1 FROM school o WHERE o.udise_code = ?)""", r.udiseCode(), today, r.schoolId(), r.udiseCode())).sum());
            written += n == null ? 0 : n;
        }
        for (int i = 0; i < pending.size(); i += BATCH) {
            List<ReportRow> batch = pending.subList(i, Math.min(pending.size(), i + BATCH));
            tx.executeWithoutResult(st -> batch.forEach(r -> jdbc.update(
                    "UPDATE school SET udise_match_status = 'PENDING_REVIEW' WHERE id = ? AND udise_code IS NULL", r.schoolId())));
        }
        return written;
    }

    private static ReportRow report(UdiseMatcher.Result r) {
        List<Map<String, Object>> c = r.candidates().stream().map(x -> Map.<String, Object>of(
                "line", x.row().line(), "udiseCode", x.row().udiseCode(), "name", x.row().name(), "pinCode", x.row().pinCode(),
                "score", Math.round(x.score() * 100) / 100.0)).toList();
        return new ReportRow(r.school().id(), r.school().name(), r.school().stateCode(), r.school().pinCode(), r.status(), r.udiseCode(),
                r.reason(), c);
    }

    private static Map<String, String> columns(List<String> header) {
        Map<String, String> out = new HashMap<>();
        for (String h : header) {
            String norm = h.toLowerCase(Locale.ROOT).trim();
            COLUMNS.forEach((key, names) -> {
                if (names.contains(norm)) {
                    out.putIfAbsent(key, h);
                }
            });
        }
        return out;
    }

    private static String blank(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }
}
