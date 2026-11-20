package com.indiaschoolfinder.notifications;

import com.indiaschoolfinder.entity.NotificationSource;
import com.indiaschoolfinder.notifications.source.OfficialSourceAdapter;
import com.indiaschoolfinder.notifications.source.SourceProfile;
import com.indiaschoolfinder.repository.NotificationSourceRepository;
import com.indiaschoolfinder.repository.SchoolRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.net.URI;
import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Predicate;
import java.util.stream.Collectors;

/**
 * Keeps the registry table (notification_source) in step with the configured sources and records how each source's
 * checks go: the last attempt, the last success, the outcome and error, and how many checks in a row have failed. A
 * source that keeps failing stays in the run (one failing site never stops the others) and shows up for staff here.
 */
@Service
public class SourceHealthService {

    private final NotificationSourceRepository sources;
    private final SchoolRepository schools;

    public SourceHealthService(NotificationSourceRepository sources, SchoolRepository schools) {
        this.sources = sources;
        this.schools = schools;
    }

    /** Writes each source's definition (name, profile, method, publishing rules); health columns are kept. */
    @Transactional
    public void register(List<OfficialSourceAdapter> adapters, Predicate<OfficialSourceAdapter> enabled, Instant now) {
        Map<String, NotificationSource> existing = new HashMap<>();
        sources.findAll().forEach(s -> existing.put(s.getKey(), s));
        for (OfficialSourceAdapter a : adapters) {
            NotificationSource s = existing.get(a.key());
            if (s == null) {
                s = new NotificationSource();
                s.setKey(a.key());
                s.setRegisteredAt(now);
            }
            SourceProfile p = a.profile();
            s.setName(clip(a.name(), 160));
            s.setInstitution(clip(p.institution(), 160));
            s.setOfficialDomain(clip(domain(a.listingUrl()), 120));
            s.setListingUrl(clip(a.listingUrl(), 600));
            s.setSourceCategory(p.sourceCategory());
            s.setSector(p.sector());
            s.setBoarding(p.boarding());
            s.setStateCode(p.stateCode());
            s.setCity(clip(p.city(), 80));
            s.setNoticeTypes(p.noticeTypes().stream().map(Enum::name).sorted().collect(Collectors.joining(",")));
            s.setExtractionMethod(p.method());
            s.setReliability(p.reliability());
            s.setAutoPublish(a.autoPublish());
            s.setEnabled(enabled.test(a));
            s.setSchoolId(p.schoolSlug() == null ? null : schools.findActiveIdBySlug(p.schoolSlug()).orElse(null));
            s.setUpdatedAt(now);
            sources.save(s);
        }
    }

    /** One source's outcome in a run. SKIPPED (switched off, or the server was stopping) is not an attempt. */
    @Transactional
    public void record(String key, SourceResult r, Instant now) {
        NotificationSource s = sources.findById(key).orElse(null);
        if (s == null || "SKIPPED".equals(r.outcome)) {
            return;
        }
        s.setLastAttemptAt(now);
        s.setLastOutcome(r.outcome);
        s.setLastError(clip(r.error, 300));
        if ("OK".equals(r.outcome)) {
            s.setLastSuccessAt(now);
            s.setConsecutiveFailures(0);
            s.setLastListed(r.listed);
            s.setLastRelevant(r.relevant);
        } else {
            s.setConsecutiveFailures(s.getConsecutiveFailures() + 1);
        }
        s.setUpdatedAt(now);
    }

    @Transactional(readOnly = true)
    public Map<String, NotificationSource> byKey() {
        Map<String, NotificationSource> out = new HashMap<>();
        sources.findAllByOrderByKeyAsc().forEach(s -> out.put(s.getKey(), s));
        return out;
    }

    private static String domain(String url) {
        try {
            String host = URI.create(url).getHost();
            return host == null ? null : host.replaceFirst("^www\\.", "");
        } catch (IllegalArgumentException e) {
            return null;
        }
    }

    private static String clip(String s, int max) {
        return s == null || s.length() <= max ? s : s.substring(0, max - 1) + "…";
    }
}
