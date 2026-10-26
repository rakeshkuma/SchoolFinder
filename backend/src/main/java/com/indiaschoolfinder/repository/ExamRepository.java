package com.indiaschoolfinder.repository;

import com.indiaschoolfinder.entity.Exam;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ExamRepository extends JpaRepository<Exam, Long> {

    Optional<Exam> findBySlug(String slug);

    Optional<Exam> findBySlugAndPublishedTrue(String slug);

    List<Exam> findByPublishedTrueOrderByDisplayOrderAscShortNameAsc();

    List<Exam> findAllByOrderByDisplayOrderAscShortNameAsc();
}
