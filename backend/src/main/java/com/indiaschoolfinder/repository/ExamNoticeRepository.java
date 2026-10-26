package com.indiaschoolfinder.repository;

import com.indiaschoolfinder.entity.ExamNotice;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;

public interface ExamNoticeRepository extends JpaRepository<ExamNotice, Long> {

    List<ExamNotice> findByExamIdInOrderByPublishedOnDescIdDesc(Collection<Long> examIds);

    void deleteByExamId(Long examId);
}
