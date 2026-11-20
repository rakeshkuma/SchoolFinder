package com.indiaschoolfinder.repository;

import com.indiaschoolfinder.entity.SiteUpdate;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface SiteUpdateRepository extends JpaRepository<SiteUpdate, Long> {

    List<SiteUpdate> findByStatus(SiteUpdate.Status status);

    Page<SiteUpdate> findByStatusOrderByPublishedOnDescIdDesc(SiteUpdate.Status status, Pageable pageable);

    Page<SiteUpdate> findByStatusInOrderByPublishedOnDescIdDesc(Collection<SiteUpdate.Status> statuses, Pageable pageable);

    long countByStatus(SiteUpdate.Status status);

    List<SiteUpdate> findBySourceKey(String sourceKey);

    Optional<SiteUpdate> findBySourceKeyAndSourceItemId(String sourceKey, String sourceItemId);

    /** Another update (editorial or from another source) that already cites this official address. */
    Optional<SiteUpdate> findFirstBySourceUrlAndIdNot(String sourceUrl, Long id);

    Optional<SiteUpdate> findFirstBySourceUrl(String sourceUrl);

    /** Marks notices as seen again without touching updated_at, so a daily check never makes an update look changed. */
    @Modifying
    @Query("update SiteUpdate u set u.lastSeenAt = :now, u.missingSince = null where u.id in :ids")
    int markSeen(@Param("ids") Collection<Long> ids, @Param("now") Instant now);

    /** Published or waiting updates whose expiry date has passed. */
    @Query("select u from SiteUpdate u where u.status in :statuses and u.expiresOn is not null and u.expiresOn < :today")
    List<SiteUpdate> findExpired(@Param("statuses") Collection<SiteUpdate.Status> statuses, @Param("today") LocalDate today);

    boolean existsBySlug(String slug);

    Optional<SiteUpdate> findBySlug(String slug);

    /** Admission and job notices of one category in the given states (the Admissions and Jobs lists filter these). */
    List<SiteUpdate> findByCategoryAndStatusIn(SiteUpdate.Category category, Collection<SiteUpdate.Status> statuses);

    /** Notices that have no page address yet (stored before V47), oldest first, a batch at a time. */
    List<SiteUpdate> findTop200ByCategoryInAndSlugIsNullOrderByIdAsc(Collection<SiteUpdate.Category> categories);

    /** Expired updates, newest first, for the public "past updates" list. */
    @Query("select u from SiteUpdate u where u.status = com.indiaschoolfinder.entity.SiteUpdate.Status.EXPIRED "
            + "and u.expiresOn >= :since and (:category is null or u.category = :category) order by u.expiresOn desc, u.id desc")
    Page<SiteUpdate> findRecentlyExpired(@Param("category") SiteUpdate.Category category, @Param("since") LocalDate since, Pageable pageable);
}
