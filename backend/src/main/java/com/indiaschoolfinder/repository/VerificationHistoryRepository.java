package com.indiaschoolfinder.repository;

import com.indiaschoolfinder.entity.VerificationHistory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface VerificationHistoryRepository extends JpaRepository<VerificationHistory, Long> {

    List<VerificationHistory> findTop50BySchoolIdOrderByVerifiedAtDesc(Long schoolId);
}
