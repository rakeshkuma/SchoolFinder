package com.indiaschoolfinder.repository;

import com.indiaschoolfinder.entity.EducationBoard;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface EducationBoardRepository extends JpaRepository<EducationBoard, Long> {

    Optional<EducationBoard> findByCodeIgnoreCase(String code);

    boolean existsByCode(String code);
}
