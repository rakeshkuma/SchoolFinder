package com.indiaschoolfinder.repository;

import com.indiaschoolfinder.entity.MemberBookmark;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface MemberBookmarkRepository extends JpaRepository<MemberBookmark, Long> {

    List<MemberBookmark> findByAccountIdOrderByCreatedAtDescIdDesc(Long accountId);

    Optional<MemberBookmark> findByAccountIdAndQuestionId(Long accountId, String questionId);

    long countByAccountId(Long accountId);
}
