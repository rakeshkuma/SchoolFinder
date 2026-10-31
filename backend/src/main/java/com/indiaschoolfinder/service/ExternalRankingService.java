package com.indiaschoolfinder.service;

import com.indiaschoolfinder.dto.admin.CsvImportResult;
import com.indiaschoolfinder.dto.common.PageResponse;
import com.indiaschoolfinder.dto.ranking.ExternalRankingDto;
import com.indiaschoolfinder.dto.ranking.ExternalRankingListItemDto;
import com.indiaschoolfinder.dto.ranking.ExternalRankingRequest;
import com.indiaschoolfinder.dto.ranking.ExternalRankingVerifyRequest;
import com.indiaschoolfinder.dto.ranking.RankingPublisherDto;
import com.indiaschoolfinder.dto.ranking.RankingPublisherRequest;
import com.indiaschoolfinder.enums.RankingPublisherKind;
import com.indiaschoolfinder.enums.RankingScope;
import com.indiaschoolfinder.enums.VerificationStatus;

import java.io.InputStream;
import java.util.List;

/**
 * Rankings published by others (EducationWorld, C fore, WIRanking, green-school ratings …), recorded entry by entry
 * with the page each appears on. They are never merged into this site's own score, never estimated, and are shown
 * publicly only once an editor has checked them against the publisher's page. Sponsored listings are never shown as
 * ranking positions.
 */
public interface ExternalRankingService {

    String REQUIRED_HEADERS = "school_slug or school_id, publisher_code or publisher, ranking_name, ranking_year, "
            + "source_url, retrieved_date";

    /** Filters for lists across schools; null means any. */
    record Filter(String publisherCode, RankingPublisherKind kind, String year, String category, RankingScope scope,
                  String region, VerificationStatus status, boolean includeSponsored, Long schoolId) {
    }

    /** Values the public filters can take. */
    record Facets(List<String> years, List<String> categories) {
    }

    List<RankingPublisherDto> publishers(boolean includeInactive);

    RankingPublisherDto savePublisher(String code, RankingPublisherRequest request);

    /** Public: verified, non-sponsored entries only, best positions first. */
    PageResponse<ExternalRankingListItemDto> publicList(Filter filter, int page, int size);

    /** Admin: every entry matching the filter, newest first. */
    PageResponse<ExternalRankingListItemDto> adminList(Filter filter, int page, int size);

    Facets facets();

    /** Public: the school's verified entries (sponsored ones included, flagged). */
    List<ExternalRankingDto> forSchool(Long schoolId);

    ExternalRankingDto add(Long schoolId, ExternalRankingRequest request);

    /** Corrects an entry; any change sends it back to UNVERIFIED. */
    ExternalRankingDto update(Long id, ExternalRankingRequest request);

    ExternalRankingDto verify(Long id, ExternalRankingVerifyRequest request);

    void delete(Long id);

    /** Same modes as the school import; every imported or changed entry is UNVERIFIED. */
    CsvImportResult importCsv(InputStream csv, CsvImportService.Mode mode);
}
