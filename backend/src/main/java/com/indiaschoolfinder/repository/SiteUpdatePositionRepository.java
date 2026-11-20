package com.indiaschoolfinder.repository;

import com.indiaschoolfinder.entity.SiteUpdatePosition;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;

public interface SiteUpdatePositionRepository extends JpaRepository<SiteUpdatePosition, Long> {

    List<SiteUpdatePosition> findBySiteUpdateIdOrderBySortOrderAscIdAsc(Long siteUpdateId);

    /** The posts of several notices at once (one query for a whole list, never one per notice). */
    List<SiteUpdatePosition> findBySiteUpdateIdInOrderBySiteUpdateIdAscSortOrderAscIdAsc(Collection<Long> siteUpdateIds);

    boolean existsBySiteUpdateIdAndOrigin(Long siteUpdateId, SiteUpdatePosition.Origin origin);

    @Modifying
    @Query("delete from SiteUpdatePosition p where p.siteUpdateId = :id and p.origin = :origin")
    int deleteBySiteUpdateIdAndOrigin(@Param("id") Long siteUpdateId, @Param("origin") SiteUpdatePosition.Origin origin);
}
