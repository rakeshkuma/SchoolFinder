package com.indiaschoolfinder.repository;

import com.indiaschoolfinder.entity.DataSource;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface DataSourceRepository extends JpaRepository<DataSource, Long> {

    List<DataSource> findByActiveTrueOrderByNameAsc();
}
