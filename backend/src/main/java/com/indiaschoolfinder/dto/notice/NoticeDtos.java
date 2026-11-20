package com.indiaschoolfinder.dto.notice;

import com.indiaschoolfinder.dto.common.PageResponse;
import com.indiaschoolfinder.dto.update.UpdateDtos;
import com.indiaschoolfinder.entity.SiteUpdate;
import com.indiaschoolfinder.notifications.opportunity.ApplicationStatus;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

/** Admission and job notices as the public site reads them: filtered lists and a notice's own page. */
public final class NoticeDtos {

    private NoticeDtos() {
    }

    /** One choice of a filter with how many current notices it matches. */
    public record Facet(String value, String label, long count) {
    }

    public record Facets(List<Facet> states, List<Facet> sectors, List<Facet> staff, List<Facet> posts, List<Facet> subjects,
                         List<Facet> statuses, List<Facet> classes, List<Facet> sessions) {
    }

    /** A page of notices (as feed items, so the site's update cards show them) and the filter choices. */
    public record NoticeList(SiteUpdate.Category category, PageResponse<UpdateDtos.UpdateItem> page, Facets facets, long current) {
    }

    public record SchoolLink(String slug, String name, String city, String stateCode) {
    }

    /** A question a reader asks about the notice, answered from its facts only (null facts give no question). */
    public record Answer(String question, String answer, String linkUrl, String linkLabel) {
    }

    /**
     * Who published the facts. EDITOR_VERIFIED: an editor checked the notice. OFFICIAL_SOURCE: taken from the official
     * site by the daily check (title, date and link as published there). EDITORIAL: written by an editor, citing the
     * official source.
     */
    public enum Verification { EDITOR_VERIFIED, OFFICIAL_SOURCE, EDITORIAL }

    public record NoticeDetail(
            long id, String slug, SiteUpdate.Category category, String path, String title, String officialTitle, String summary,
            String institutionName, String campus, SchoolLink school, SiteUpdate.Sector sector, Boolean boarding,
            String stateCode, String stateName, String stateSlug, String city,
            SiteUpdate.NoticeType noticeType, String noticeTypeLabel, ApplicationStatus applicationStatus, String applicationStatusLabel,
            LocalDate publishedOn, boolean dateConfirmed, LocalDate opensOn, LocalDate closesOn, LocalDate examOn, String examLabel,
            String academicSession, String classes, List<Facet> postTypes, List<String> subjects, SiteUpdate.StaffKind staffKind,
            SiteUpdate.EmploymentType employmentType, Integer vacancies, String eligibility, String experience, String tetRequirement,
            String ageLimit, String salaryText, String applicationFee, String selectionProcess, String applyUrl,
            String sourceUrl, String sourceName, String sourceDomain, String reliability, Verification verification,
            Instant lastVerifiedAt, Instant lastChangedAt, boolean current, boolean indexable,
            List<UpdateDtos.PositionRow> positions, List<Answer> answers, List<UpdateDtos.UpdateItem> related) {
    }
}
