package com.indiaschoolfinder.repository;

import com.indiaschoolfinder.entity.AdmissionEnquiry;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AdmissionEnquiryRepository extends JpaRepository<AdmissionEnquiry, Long> {

    Page<AdmissionEnquiry> findByStatusOrderByCreatedAtDesc(AdmissionEnquiry.Status status, Pageable pageable);

    long countByStatus(AdmissionEnquiry.Status status);
}
