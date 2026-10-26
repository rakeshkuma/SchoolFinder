package com.indiaschoolfinder.service;

import com.indiaschoolfinder.dto.common.PageResponse;
import com.indiaschoolfinder.dto.location.SuggestionDto;
import com.indiaschoolfinder.dto.school.FacilityDto;
import com.indiaschoolfinder.dto.school.FacilityRequest;
import com.indiaschoolfinder.dto.school.ImageDto;
import com.indiaschoolfinder.dto.school.SchoolDetailDto;
import com.indiaschoolfinder.dto.school.SchoolRequest;
import com.indiaschoolfinder.dto.school.SchoolSearchCriteria;
import com.indiaschoolfinder.dto.school.SchoolStatusRequest;
import com.indiaschoolfinder.dto.school.SchoolSummaryDto;

import java.util.List;

public interface SchoolService {

    PageResponse<SchoolSummaryDto> search(SchoolSearchCriteria criteria);

    /** Schools with a publishable real photograph, verified first (not a ranking); state optional. */
    List<SchoolSummaryDto> featured(String state, int limit);

    /** Autocomplete: up to {@code limit} schools plus matching states, districts and cities. */
    SuggestionDto suggest(String q, int limit);

    SchoolDetailDto getActiveById(Long id);

    SchoolDetailDto getActiveBySlug(String slug);

    /** Admin view: includes inactive schools. */
    SchoolDetailDto getById(Long id);

    /** Admin list including inactive schools. */
    PageResponse<SchoolSummaryDto> adminList(String q, Boolean active, int page, int size);

    List<SchoolSummaryDto> nearby(double latitude, double longitude, double radiusKm, int limit, Long excludeSchoolId);

    SchoolDetailDto create(SchoolRequest request);

    /** @param expectedVersion optional optimistic-lock version from the If-Match header */
    SchoolDetailDto update(Long id, SchoolRequest request, Long expectedVersion);

    SchoolDetailDto updateStatus(Long id, SchoolStatusRequest request);

    List<FacilityDto> facilities(Long schoolId);

    FacilityDto addFacility(Long schoolId, FacilityRequest request);

    List<ImageDto> images(Long schoolId);

    /** Throws 404 unless an active school with this id exists. */
    void requireActive(Long schoolId);

    /** Card summaries (cover image, lowest official fee, admission status) for already-loaded schools, by id. */
    java.util.Map<Long, SchoolSummaryDto> summaries(java.util.Collection<com.indiaschoolfinder.entity.School> schools);
}
