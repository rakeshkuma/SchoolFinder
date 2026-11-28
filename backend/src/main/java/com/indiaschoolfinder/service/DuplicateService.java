package com.indiaschoolfinder.service;

import com.indiaschoolfinder.exception.BusinessValidationException;
import com.indiaschoolfinder.exception.ResourceNotFoundException;
import com.indiaschoolfinder.util.InputSanitizer;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Finds active schools that may be the same school recorded twice. Creation and import already refuse exact duplicates
 * (same UDISE code, same board affiliation, or same name and PIN code in a state); this report catches the rest. Each
 * group is a suggestion for an editor: pairs checked and found different can be dismissed, and a real duplicate is
 * deactivated by an administrator with the reason recorded.
 */
@Service
public class DuplicateService {

    public enum Reason {
        /** Same name (ignoring spaces and punctuation) in the same district. */
        SAME_NAME_IN_DISTRICT,
        /** The same phone number in the same state. */
        SAME_PHONE,
        /** Map positions within about 10 metres. */
        SAME_LOCATION,
        /** One photograph registered for two schools: one of them is probably misidentified. */
        SAME_PHOTO
    }

    public record SchoolRef(long id, String name, String slug, String city, String stateCode, String pinCode,
                            String boardCode, String affiliationNumber, String udiseCode) {
    }

    public record Group(Reason reason, String detail, List<SchoolRef> schools) {
    }

    public record Report(List<Group> groups, Map<Reason, Integer> counts) {
    }

    private static final int MAX_GROUPS = 100;
    private static final String SCHOOL_COLUMNS = "s.id, s.name, s.slug, s.city, s.state_code, s.pin_code, s.education_board_code, "
            + "s.affiliation_number, s.udise_code";

    private final JdbcTemplate jdbc;
    private final AuditService audit;

    public DuplicateService(JdbcTemplate jdbc, AuditService audit) {
        this.jdbc = jdbc;
        this.audit = audit;
    }

    @Transactional(readOnly = true)
    public Report report() {
        Set<String> dismissed = new HashSet<>();
        jdbc.query("select school_a, school_b from duplicate_dismissal", (rs) -> {
            dismissed.add(rs.getLong(1) + "-" + rs.getLong(2));
        });
        List<Group> groups = new ArrayList<>();
        // Each check is one pass with a window count, so the report stays fast on tens of thousands of schools.
        groups.addAll(groups(Reason.SAME_NAME_IN_DISTRICT, """
                select * from (
                    select s.state_code || '/' || s.district_id || '/' || lower(regexp_replace(s.name, '[^A-Za-z0-9]', '', 'g')) as k,
                           count(*) over (partition by s.district_id, lower(regexp_replace(s.name, '[^A-Za-z0-9]', '', 'g'))) as n,
                           %s
                    from school s where s.active and s.district_id is not null) x
                where n > 1 order by k, id""", dismissed, (k) -> "Same name in the same district"));
        groups.addAll(groups(Reason.SAME_PHONE, """
                select * from (
                    select s.state_code || '/' || right(regexp_replace(split_part(s.phone, ',', 1), '[^0-9]', '', 'g'), 10) as k,
                           count(*) over (partition by s.state_code,
                               right(regexp_replace(split_part(s.phone, ',', 1), '[^0-9]', '', 'g'), 10)) as n,
                           %s
                    from school s where s.active and length(regexp_replace(split_part(s.phone, ',', 1), '[^0-9]', '', 'g')) >= 8) x
                where n > 1 order by k, id""", dismissed, (k) -> "Phone number ending " + k.substring(k.indexOf('/') + 1)));
        groups.addAll(groups(Reason.SAME_LOCATION, """
                select * from (
                    select round(s.latitude::numeric, 4) || ',' || round(s.longitude::numeric, 4) as k,
                           count(*) over (partition by round(s.latitude::numeric, 4), round(s.longitude::numeric, 4)) as n,
                           %s
                    from school s where s.active and s.latitude is not null and s.longitude is not null) x
                where n > 1 order by k, id""", dismissed, (k) -> "Map position " + k));
        groups.addAll(groups(Reason.SAME_PHOTO, """
                select i.url as k, %s from school_image i join school s on s.id = i.school_id
                where s.active and i.url in (select url from school_image group by url having count(distinct school_id) > 1)
                order by k, s.id""", dismissed, (k) -> "The same photo: " + k));
        Map<Reason, Integer> counts = new LinkedHashMap<>();
        for (Reason r : Reason.values()) counts.put(r, (int) groups.stream().filter(g -> g.reason() == r).count());
        return new Report(groups, counts);
    }

    /** Records that the schools were checked and are different schools; the pairs no longer appear in the report. */
    @Transactional
    public void dismiss(List<Long> schoolIds, String note) {
        List<Long> ids = schoolIds.stream().distinct().sorted().toList();
        if (ids.size() < 2) throw new BusinessValidationException("schoolIds", "choose at least two schools");
        Integer found = jdbc.queryForObject("select count(*) from school where id = any(?)", Integer.class,
                (Object) ids.toArray(Long[]::new));
        if (found == null || found != ids.size()) throw new ResourceNotFoundException("School", ids);
        String by = SecurityContextHolder.getContext().getAuthentication() == null ? "system"
                : SecurityContextHolder.getContext().getAuthentication().getName();
        String clean = InputSanitizer.clean(note);
        for (int i = 0; i < ids.size(); i++) {
            for (int j = i + 1; j < ids.size(); j++) {
                jdbc.update("insert into duplicate_dismissal (school_a, school_b, note, created_by) values (?, ?, ?, ?) "
                        + "on conflict (school_a, school_b) do nothing", ids.get(i), ids.get(j), clean, by);
            }
        }
        audit.record("DUPLICATE_DISMISSED", "SCHOOL", ids.getFirst(), "schools=" + ids + (clean == null ? "" : ", note=" + clean));
    }

    private interface Label {
        String of(String key);
    }

    /** Rows sorted by key become groups; a group is dropped when every pair in it was dismissed. */
    private List<Group> groups(Reason reason, String sql, Set<String> dismissed, Label label) {
        Map<String, List<SchoolRef>> byKey = new LinkedHashMap<>();
        jdbc.query(sql.formatted(SCHOOL_COLUMNS), (rs) -> {
            byKey.computeIfAbsent(rs.getString("k"), k -> new ArrayList<>()).add(new SchoolRef(rs.getLong("id"),
                    rs.getString("name"), rs.getString("slug"), rs.getString("city"), rs.getString("state_code"),
                    rs.getString("pin_code"), rs.getString("education_board_code"), rs.getString("affiliation_number"),
                    rs.getString("udise_code")));
        });
        List<Group> out = new ArrayList<>();
        for (var e : byKey.entrySet()) {
            List<SchoolRef> schools = e.getValue().stream().filter(distinctBy(new HashSet<>())).toList();
            if (schools.size() < 2 || allDismissed(schools, dismissed)) continue;
            out.add(new Group(reason, label.of(e.getKey()), schools));
            if (out.size() == MAX_GROUPS) break;
        }
        return out;
    }

    private static java.util.function.Predicate<SchoolRef> distinctBy(Set<Long> seen) {
        return s -> seen.add(s.id());
    }

    private static boolean allDismissed(List<SchoolRef> schools, Set<String> dismissed) {
        long[] ids = schools.stream().mapToLong(SchoolRef::id).sorted().toArray();
        for (int i = 0; i < ids.length; i++) {
            for (int j = i + 1; j < ids.length; j++) {
                if (!dismissed.contains(ids[i] + "-" + ids[j])) return false;
            }
        }
        return true;
    }

}
