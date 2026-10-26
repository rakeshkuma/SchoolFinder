package com.indiaschoolfinder.repository;

import com.indiaschoolfinder.entity.State;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface StateRepository extends JpaRepository<State, Long> {

    List<State> findAllByOrderByNameAsc();

    Optional<State> findByCode(String code);

    Optional<State> findBySlug(String slug);

    Optional<State> findByNameIgnoreCase(String name);

    boolean existsByCode(String code);
}
