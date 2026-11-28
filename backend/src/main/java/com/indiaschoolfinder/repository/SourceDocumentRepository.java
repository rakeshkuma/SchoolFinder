package com.indiaschoolfinder.repository;

import com.indiaschoolfinder.entity.SourceDocument;
import com.indiaschoolfinder.enums.DocumentStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface SourceDocumentRepository extends JpaRepository<SourceDocument, Long> {

    Optional<SourceDocument> findBySha256(String sha256);

    @Query("select d from SourceDocument d where (:status is null or d.status = :status)"
            + " and (:schoolId is null or d.schoolId = :schoolId) order by d.createdAt desc, d.id desc")
    Page<SourceDocument> search(@Param("status") DocumentStatus status, @Param("schoolId") Long schoolId, Pageable pageable);
}
