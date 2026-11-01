package com.indiaschoolfinder.repository;

import com.indiaschoolfinder.entity.RankingSource;
import com.indiaschoolfinder.enums.RankingScope;
import com.indiaschoolfinder.enums.VerificationStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface RankingSourceRepository extends JpaRepository<RankingSource, Long> {

    List<RankingSource> findBySchoolIdOrderByRankingYearDesc(Long schoolId);

    List<RankingSource> findBySchoolIdAndVerificationStatusOrderByRankingYearDesc(Long schoolId, VerificationStatus status);

    /** Null filters match everything; text filters are exact and case-insensitive. */
    @Query("select r from RankingSource r where (:anyPublisher = true or r.publisherId in :publisherIds)"
            + " and (:year is null or r.rankingYear = :year)"
            + " and (:category is null or lower(r.category) = lower(cast(:category as string)))"
            + " and (:scope is null or r.scope = :scope)"
            + " and (:region is null or lower(r.region) = lower(cast(:region as string)))"
            + " and (:status is null or r.verificationStatus = :status)"
            + " and (:includeSponsored = true or r.sponsored = false)"
            + " and (:schoolId is null or r.schoolId = :schoolId)"
            + " and (:activeOnly = false or exists (select 1 from School s where s.id = r.schoolId and s.active = true))")
    Page<RankingSource> search(@Param("anyPublisher") boolean anyPublisher,
                               @Param("publisherIds") java.util.Collection<Long> publisherIds, @Param("year") String year,
                               @Param("category") String category, @Param("scope") RankingScope scope,
                               @Param("region") String region, @Param("status") VerificationStatus status,
                               @Param("includeSponsored") boolean includeSponsored, @Param("schoolId") Long schoolId,
                               @Param("activeOnly") boolean activeOnly, Pageable pageable);

    @Query("select distinct r.rankingYear from RankingSource r where r.verificationStatus = :status and r.sponsored = false"
            + " order by r.rankingYear desc")
    List<String> years(@Param("status") VerificationStatus status);

    @Query("select distinct r.category from RankingSource r where r.verificationStatus = :status and r.sponsored = false"
            + " and r.category is not null order by r.category")
    List<String> categories(@Param("status") VerificationStatus status);

    @Query("select r.publisherId, count(r) from RankingSource r where r.verificationStatus = :status"
            + " and r.sponsored = false and r.publisherId is not null group by r.publisherId")
    List<Object[]> countByPublisher(@Param("status") VerificationStatus status);

    @org.springframework.data.jpa.repository.Modifying
    @Query("update RankingSource r set r.publisher = :name where r.publisherId = :publisherId")
    int renamePublisher(@Param("publisherId") Long publisherId, @Param("name") String name);

    @Query("select r from RankingSource r where r.schoolId = :schoolId and lower(r.publisher) = lower(cast(:publisher as string))"
            + " and lower(r.rankingName) = lower(cast(:name as string)) and r.rankingYear = :year"
            + " and lower(coalesce(r.category, '')) = lower(cast(:category as string))"
            + " and lower(coalesce(r.region, '')) = lower(cast(:region as string))")
    Optional<RankingSource> findEntry(@Param("schoolId") Long schoolId, @Param("publisher") String publisher,
                                      @Param("name") String rankingName, @Param("year") String year,
                                      @Param("category") String category, @Param("region") String region);
}
