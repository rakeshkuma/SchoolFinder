package com.indiaschoolfinder.dto.ranking;

import com.indiaschoolfinder.dto.admin.CsvImportResult;
import com.indiaschoolfinder.enums.RankingPublisherKind;
import com.indiaschoolfinder.enums.RankingScope;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

/** The public ranking tables: one published list at a time, never a mix of publishers or years. */
public final class RankingCatalogDtos {

    private RankingCatalogDtos() {
    }

    public record Parameter(String name, BigDecimal weight, String description) {
    }

    /** One published list. {@code entries}: verified entries we show. {@code hasScores}: at least one carries a score. */
    public record Edition(long id, String publisherCode, String publisher, RankingPublisherKind kind, String name, String year,
                          String categoryCode, String category, String family, String boardCode, RankingScope scope, String region,
                          boolean ratingBased, boolean hasScores, BigDecimal maxScore, String methodology, String sourceUrl,
                          LocalDate publishedOn, LocalDate collectedOn, LocalDate lastVerified, long entries, List<Parameter> parameters) {
    }

    /**
     * What to show: a list, and filters over its schools. Filters never renumber: each rank stays the publisher's.
     * {@code maxRank} keeps national ranks up to that number, so a Top 10 is the publisher's top ten places, not ten rows.
     * {@code government} and {@code boarding} are the group codes given in {@link Places}; boarding "ANY" means every boarding school.
     */
    public record Query(long edition, String state, String district, String city, String board, String schoolType, String gender,
                        String residence, String rating, String q, Integer maxRank, String government, String boarding) {
    }

    /** One school in a list. A rank is null when the publisher did not print it; national, state and city are separate. */
    public record Row(long entryId, Integer nationalRank, Integer stateRank, Integer cityRank, BigDecimal score, BigDecimal maxScore,
                      String scoreText, String rating, long schoolId, String schoolName, String slug, String city, String district,
                      String stateCode, String stateName, String board, String schoolType, String genderType, String boardingType,
                      String imageUrl, String imageCredit, LocalDate lastVerified) {
    }

    public record StatePlace(String code, String name, String slug, long entries) {
    }

    public record CityPlace(String name, String stateCode, long entries) {
    }

    public record DistrictPlace(String slug, String name, String stateCode, long entries) {
    }

    public record Group(String code, long entries) {
    }

    /** What a list has entries for, so a visitor can only pick a place or group with something to show. */
    public record Places(List<StatePlace> states, List<CityPlace> cities, List<DistrictPlace> districts, List<Group> boards,
                         List<Group> government, List<Group> boarding) {
    }

    /** Which ranking pages have verified data behind them, across all lists. Ratings never count towards academic pages. */
    public record Sections(boolean rankings, boolean boards, boolean government, boolean boarding, boolean green) {
    }

    public record ImportJob(long id, String fileName, String mode, int totalRows, int validRows, int created, int updated, boolean committed,
                            List<CsvImportResult.RowError> errors, String importedBy, Instant importedAt, String approvedBy, Instant approvedAt,
                            long awaitingApproval) {
    }

    public record ApproveRequest(@Size(max = 500) String note) {
    }
}
