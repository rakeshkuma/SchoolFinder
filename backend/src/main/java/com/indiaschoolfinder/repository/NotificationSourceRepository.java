package com.indiaschoolfinder.repository;

import com.indiaschoolfinder.entity.NotificationSource;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface NotificationSourceRepository extends JpaRepository<NotificationSource, String> {

    List<NotificationSource> findAllByOrderByKeyAsc();
}
