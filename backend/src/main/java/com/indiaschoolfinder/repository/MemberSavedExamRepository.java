package com.indiaschoolfinder.repository;

import com.indiaschoolfinder.entity.MemberSavedExam;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface MemberSavedExamRepository extends JpaRepository<MemberSavedExam, Long> {

    List<MemberSavedExam> findByAccountIdOrderByCreatedAtDescIdDesc(Long accountId);

    Optional<MemberSavedExam> findByAccountIdAndExamSlug(Long accountId, String examSlug);

    long countByAccountId(Long accountId);
}
