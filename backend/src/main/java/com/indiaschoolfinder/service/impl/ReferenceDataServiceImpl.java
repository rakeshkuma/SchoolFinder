package com.indiaschoolfinder.service.impl;

import com.indiaschoolfinder.dto.reference.DataSourceDto;
import com.indiaschoolfinder.dto.reference.EducationBoardDto;
import com.indiaschoolfinder.dto.reference.SchoolClassDto;
import com.indiaschoolfinder.dto.reference.SiteStatsDto;
import com.indiaschoolfinder.entity.SchoolClass;
import com.indiaschoolfinder.enums.VerificationStatus;
import com.indiaschoolfinder.exception.BusinessValidationException;
import com.indiaschoolfinder.mapper.SchoolMapper;
import com.indiaschoolfinder.repository.DataSourceRepository;
import com.indiaschoolfinder.repository.EducationBoardRepository;
import com.indiaschoolfinder.repository.SchoolClassRepository;
import com.indiaschoolfinder.repository.SchoolFeeRepository;
import com.indiaschoolfinder.repository.SchoolRepository;
import com.indiaschoolfinder.service.ReferenceDataService;
import com.indiaschoolfinder.util.AcademicYears;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class ReferenceDataServiceImpl implements ReferenceDataService {

    private final EducationBoardRepository boardRepository;
    private final SchoolClassRepository classRepository;
    private final DataSourceRepository dataSourceRepository;
    private final SchoolRepository schoolRepository;
    private final SchoolFeeRepository feeRepository;
    private final SchoolMapper mapper;
    private final Clock clock;

    public ReferenceDataServiceImpl(EducationBoardRepository boardRepository, SchoolClassRepository classRepository,
                                    DataSourceRepository dataSourceRepository, SchoolRepository schoolRepository,
                                    SchoolFeeRepository feeRepository, SchoolMapper mapper, Clock clock) {
        this.boardRepository = boardRepository;
        this.classRepository = classRepository;
        this.dataSourceRepository = dataSourceRepository;
        this.schoolRepository = schoolRepository;
        this.feeRepository = feeRepository;
        this.mapper = mapper;
        this.clock = clock;
    }

    @Override
    public List<EducationBoardDto> boards() {
        return boardRepository.findAll(Sort.by("name")).stream().map(mapper::toBoardDto).toList();
    }

    @Override
    public List<SchoolClassDto> classes() {
        return classRepository.findAllByOrderBySortOrderAsc().stream().map(mapper::toClassDto).toList();
    }

    @Override
    public List<String> localities() {
        return schoolRepository.findDistinctLocalities();
    }

    @Override
    public List<DataSourceDto> dataSources() {
        return dataSourceRepository.findByActiveTrueOrderByNameAsc().stream()
                .map(d -> new DataSourceDto(d.getName(), d.getUrl(), d.getSourceType(), d.getPublisher(),
                        d.getDescription(), d.getLastCheckedDate()))
                .toList();
    }

    /** The home page asks for these counts on every visit; they change only with imports, so five minutes is fresh enough. */
    private static final java.time.Duration STATS_TTL = java.time.Duration.ofMinutes(5);
    private record CachedStats(SiteStatsDto stats, java.time.Instant at) {
    }
    private final java.util.concurrent.atomic.AtomicReference<CachedStats> statsCache = new java.util.concurrent.atomic.AtomicReference<>();

    @Override
    public SiteStatsDto stats() {
        CachedStats cached = statsCache.get();
        java.time.Instant now = clock.instant();
        if (cached != null && cached.at().plus(STATS_TTL).isAfter(now)) {
            return cached.stats();
        }
        SiteStatsDto fresh = computeStats();
        statsCache.set(new CachedStats(fresh, now));
        return fresh;
    }

    private SiteStatsDto computeStats() {
        String year = currentAcademicYear();
        return new SiteStatsDto(schoolRepository.countByActiveTrue(),
                schoolRepository.countByActiveTrueAndVerificationStatus(VerificationStatus.VERIFIED),
                schoolRepository.findDistinctLocalities().size(),
                schoolRepository.countStatesWithActiveSchools(),
                schoolRepository.countDistrictsWithActiveSchools(),
                feeRepository.countSchoolsWithFees(year), year);
    }

    @Override
    public SchoolClass requireClass(String code, String field) {
        return classRepository.findByCodeIgnoreCase(code == null ? "" : code.trim())
                .orElseThrow(() -> new BusinessValidationException(field, "unknown class code: " + code));
    }

    @Override
    public Map<Long, SchoolClass> classesById() {
        return classRepository.findAll().stream().collect(Collectors.toMap(SchoolClass::getId, Function.identity()));
    }

    @Override
    public String currentAcademicYear() {
        return AcademicYears.of(LocalDate.now(clock));
    }
}
