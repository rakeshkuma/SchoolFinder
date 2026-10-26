package com.indiaschoolfinder.service;

import com.indiaschoolfinder.dto.fee.FeeCalculationRequest;
import com.indiaschoolfinder.dto.fee.FeeComparisonDto;
import com.indiaschoolfinder.dto.fee.FeeDto;
import com.indiaschoolfinder.dto.fee.FeeEstimate;
import com.indiaschoolfinder.dto.fee.FeeRequest;

import java.util.List;

public interface FeeService {

    List<FeeDto> feeHistory(Long schoolId);

    /** Creates or replaces the fee schedule for (school, class, academic year). */
    FeeDto upsert(Long schoolId, FeeRequest request);

    FeeComparisonDto compare(List<Long> schoolIds, String classCode, String academicYear);

    List<FeeEstimate> calculate(FeeCalculationRequest request);
}
