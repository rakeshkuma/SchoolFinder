package com.indiaschoolfinder.repository;

import com.indiaschoolfinder.entity.ExamDate;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;

public interface ExamDateRepository extends JpaRepository<ExamDate, Long> {

    List<ExamDate> findByExamIdInOrderByStartsOnAscSortOrderAsc(Collection<Long> examIds);

    void deleteByExamId(Long examId);
}
