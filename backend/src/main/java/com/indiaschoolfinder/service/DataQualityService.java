package com.indiaschoolfinder.service;

import com.indiaschoolfinder.dto.admin.CoverageReport;
import com.indiaschoolfinder.dto.admin.DataQualityReport;

public interface DataQualityService {

    DataQualityReport report();

    /** Per-state counts of imported, verified and incomplete records; priority states first. */
    CoverageReport coverage();
}
