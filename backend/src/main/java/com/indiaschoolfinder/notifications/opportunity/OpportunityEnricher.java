package com.indiaschoolfinder.notifications.opportunity;

import com.indiaschoolfinder.entity.SiteUpdate;
import com.indiaschoolfinder.entity.SiteUpdatePosition;
import com.indiaschoolfinder.notifications.source.SourceProfile;
import com.indiaschoolfinder.repository.SchoolRepository;
import com.indiaschoolfinder.repository.SiteUpdatePositionRepository;
import com.indiaschoolfinder.repository.SiteUpdateRepository;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Gives an admission or job notice its facts: the institution's (from the source registry) and the notice's own (from
 * its words, {@link OpportunityClassifier}), its page address, and the posts its title names. Only what is stated is
 * filled in; a fact staff have entered is never replaced (callers skip staff-edited notices).
 */
@Component
public class OpportunityEnricher {

    private final SiteUpdateRepository updates;
    private final SiteUpdatePositionRepository positions;
    private final SchoolRepository schools;
    /** School ids by slug, looked up once per slug (a source's school does not change between notices). */
    private final Map<String, Long> schoolIds = new ConcurrentHashMap<>();

    public OpportunityEnricher(SiteUpdateRepository updates, SiteUpdatePositionRepository positions, SchoolRepository schools) {
        this.updates = updates;
        this.positions = positions;
        this.schools = schools;
    }

    /**
     * @param facts           the classifier's reading of the notice's official title
     * @param listedClosesOn  a last date the listing states in a field of its own (wins over one read from the title)
     * @param deriveDates     true for notices found by the daily check, whose card date is worked out from the facts;
     *                        false for an editor's notice, whose dates the editor set
     */
    public void apply(SiteUpdate u, SourceProfile profile, OpportunityClassifier.Facts facts, LocalDate listedClosesOn, boolean deriveDates) {
        apply(u, profile, facts, listedClosesOn, null, deriveDates);
    }

    /**
     * @param listedEmployment a kind of employment the listing states in a field of its own (an employer's JobPosting
     *                         data); it wins over one read from the title, as a listed last date does
     */
    public void apply(SiteUpdate u, SourceProfile profile, OpportunityClassifier.Facts facts, LocalDate listedClosesOn,
                      SiteUpdate.EmploymentType listedEmployment, boolean deriveDates) {
        if (!u.isOpportunity() || facts == null) {
            return;
        }
        if (profile != null) {
            if (u.getInstitutionName() == null) u.setInstitutionName(clip(profile.institution(), 160));
            if (u.getSector() == null) u.setSector(profile.sector());
            if (u.getBoarding() == null) u.setBoarding(profile.boarding());
            if (u.getStateCode() == null) u.setStateCode(profile.stateCode());
            if (u.getCity() == null) u.setCity(clip(profile.city(), 80));
            if (u.getSchoolId() == null && profile.schoolSlug() != null) u.setSchoolId(schoolId(profile.schoolSlug()));
        } else if (u.getInstitutionName() == null) {
            u.setInstitutionName(clip(u.getSourceName(), 160));
        }
        u.setNoticeType(facts.noticeType());
        u.setPostTypes(join(facts.postTypes(), 160));
        u.setSubjects(join(facts.subjects(), 240));
        u.setStaffKind(facts.staffKind());
        u.setEmploymentType(listedEmployment != null ? listedEmployment : facts.employmentType());
        u.setAcademicSession(facts.academicSession());
        u.setClasses(facts.classes());
        u.setVacancies(facts.vacancies());
        if (deriveDates) {
            LocalDate closes = listedClosesOn != null ? listedClosesOn : facts.closesOn();
            LocalDate opens = facts.opensOn() != null && (closes == null || !facts.opensOn().isAfter(closes)) ? facts.opensOn() : null;
            u.setOpensOn(opens);
            u.setClosesOn(closes);
            u.setExamOn(facts.examOn());
            // The card's date line (the existing card shows eventDate with its label).
            if (closes != null) {
                u.setEventDate(closes);
                u.setEventLabel(facts.walkIn() ? "Walk-in interview" : closes.equals(facts.examOn()) ? "Interview" : "Last date");
                u.setDeadline(true);
            } else if (facts.examOn() != null) {
                u.setEventDate(facts.examOn());
                u.setEventLabel(u.getCategory() == SiteUpdate.Category.JOB ? "Interview / exam" : "Exam date");
                u.setDeadline(false);
            } else if (opens != null && u.getPublishedOn() != null && opens.isAfter(u.getPublishedOn())) {
                u.setEventDate(opens);
                u.setEventLabel("Applications open");
                u.setDeadline(false);
            } else {
                u.setEventDate(null);
                u.setEventLabel(null);
                u.setDeadline(false);
            }
        }
        assignSlug(u);
    }

    /** Gives an admission or job notice its page address if it has none (and changes nothing else). */
    public void assignSlug(SiteUpdate u) {
        if (u.isOpportunity() && u.getSlug() == null) {
            String kind = u.getCategory() == SiteUpdate.Category.JOB ? "recruitment" : "admission";
            String institution = u.getInstitutionName() != null ? u.getInstitutionName() : u.getSourceName();
            u.setSlug(NoticeSlugs.make(u.getTitle(), institution, kind, u.getPublishedOn(), updates::existsBySlug));
        }
    }

    /** The posts the title names, replacing earlier ones read from a title; an editor's list is left alone. */
    public void savePositions(Long siteUpdateId, OpportunityClassifier.Facts facts) {
        if (siteUpdateId == null || facts == null
                || positions.existsBySiteUpdateIdAndOrigin(siteUpdateId, SiteUpdatePosition.Origin.EDITOR)) {
            return;
        }
        positions.deleteBySiteUpdateIdAndOrigin(siteUpdateId, SiteUpdatePosition.Origin.TITLE);
        List<OpportunityClassifier.Position> list = facts.positions();
        for (int i = 0; i < list.size(); i++) {
            OpportunityClassifier.Position p = list.get(i);
            SiteUpdatePosition row = new SiteUpdatePosition();
            row.setSiteUpdateId(siteUpdateId);
            row.setPostName(clip(p.postName(), 120));
            row.setPostType(p.postType());
            row.setSubject(clip(p.subject(), 80));
            row.setSortOrder(i);
            row.setOrigin(SiteUpdatePosition.Origin.TITLE);
            positions.save(row);
        }
    }

    /** Forgets looked-up school ids (called at the start of each run, so a school added since is found). */
    public void clearCache() {
        schoolIds.clear();
    }

    private Long schoolId(String slug) {
        Long cached = schoolIds.get(slug);
        if (cached != null) {
            return cached > 0 ? cached : null;
        }
        Long id;
        if (slug.startsWith("cbse:")) { // "cbse:1100047": the school's CBSE affiliation number, as a family's site list gives it
            List<Long> ids = schools.findActiveIdsByAffiliation("CBSE", slug.substring(5));
            id = ids.size() == 1 ? ids.get(0) : -1L;
        } else {
            id = schools.findActiveIdBySlug(slug).orElse(-1L);
        }
        schoolIds.put(slug, id);
        return id > 0 ? id : null;
    }

    private static String join(List<String> values, int max) {
        if (values == null || values.isEmpty()) {
            return null;
        }
        StringBuilder b = new StringBuilder();
        for (String v : values) {
            if (b.length() + v.length() + 1 > max) break;
            if (!b.isEmpty()) b.append(',');
            b.append(v);
        }
        return b.toString();
    }

    private static String clip(String s, int max) {
        return s == null || s.length() <= max ? s : s.substring(0, max - 1) + "…";
    }
}
