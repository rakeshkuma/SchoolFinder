package com.indiaschoolfinder.service;

import com.indiaschoolfinder.dto.reference.DataSourceDto;
import com.indiaschoolfinder.dto.reference.EducationBoardDto;
import com.indiaschoolfinder.dto.reference.SchoolClassDto;
import com.indiaschoolfinder.dto.reference.SiteStatsDto;
import com.indiaschoolfinder.entity.SchoolClass;

import java.util.List;
import java.util.Map;

public interface ReferenceDataService {

    List<EducationBoardDto> boards();

    List<SchoolClassDto> classes();

    List<String> localities();

    List<DataSourceDto> dataSources();

    SiteStatsDto stats();

    /** Resolves a class code or throws a 400 naming the field. */
    SchoolClass requireClass(String code, String field);

    /** id → class, for mapping child records without per-row queries. */
    Map<Long, SchoolClass> classesById();

    String currentAcademicYear();
}
