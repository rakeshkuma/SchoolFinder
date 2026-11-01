package com.indiaschoolfinder.service.impl;

import com.indiaschoolfinder.dto.location.CityDto;
import com.indiaschoolfinder.dto.location.DistrictDto;
import com.indiaschoolfinder.dto.location.StateDto;
import com.indiaschoolfinder.dto.location.SuggestionDto.PlaceSuggestion;
import com.indiaschoolfinder.entity.District;
import com.indiaschoolfinder.entity.State;
import com.indiaschoolfinder.exception.BusinessValidationException;
import com.indiaschoolfinder.exception.ResourceNotFoundException;
import com.indiaschoolfinder.repository.DistrictRepository;
import com.indiaschoolfinder.repository.SchoolRepository;
import com.indiaschoolfinder.repository.StateRepository;
import com.indiaschoolfinder.service.AuditService;
import com.indiaschoolfinder.service.LocationService;
import com.indiaschoolfinder.util.InputSanitizer;
import com.indiaschoolfinder.util.SlugUtil;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class LocationServiceImpl implements LocationService {

    private final StateRepository stateRepository;
    private final DistrictRepository districtRepository;
    private final SchoolRepository schoolRepository;
    private final AuditService auditService;

    public LocationServiceImpl(StateRepository stateRepository, DistrictRepository districtRepository,
                               SchoolRepository schoolRepository, AuditService auditService) {
        this.stateRepository = stateRepository;
        this.districtRepository = districtRepository;
        this.schoolRepository = schoolRepository;
        this.auditService = auditService;
    }

    @Override
    public List<StateDto> states() {
        Map<String, Long> counts = new HashMap<>();
        for (Object[] row : schoolRepository.countActiveByState()) {
            counts.put((String) row[0], ((Number) row[1]).longValue());
        }
        return stateRepository.findAllByOrderByNameAsc().stream()
                .map(s -> toDto(s, counts.getOrDefault(s.getCode(), 0L)))
                .toList();
    }

    @Override
    public StateDto state(String codeOrSlug) {
        State state = requireState(codeOrSlug);
        long count = schoolRepository.countActiveByState().stream()
                .filter(row -> state.getCode().equals(row[0]))
                .mapToLong(row -> ((Number) row[1]).longValue())
                .findFirst().orElse(0L);
        return toDto(state, count);
    }

    @Override
    public List<DistrictDto> districts(String stateCodeOrSlug) {
        State state = requireState(stateCodeOrSlug);
        return districtRepository.findWithSchoolCounts(state.getCode()).stream()
                .map(r -> new DistrictDto(((Number) r[0]).longValue(), state.getCode(), (String) r[1], (String) r[2],
                        ((Number) r[3]).longValue()))
                .toList();
    }

    @Override
    public List<CityDto> cities(String stateCodeOrSlug) {
        State state = requireState(stateCodeOrSlug);
        return schoolRepository.countActiveByCity(state.getCode()).stream()
                .map(r -> new CityDto((String) r[0], SlugUtil.toSlug((String) r[0]), state.getCode(), ((Number) r[1]).longValue()))
                .toList();
    }

    @Override
    public List<com.indiaschoolfinder.dto.location.IndiaCityDto> citiesAcrossIndia() {
        java.util.Map<String, State> states = new java.util.HashMap<>();
        stateRepository.findAllByOrderByNameAsc().forEach(s -> states.put(s.getCode(), s));
        return schoolRepository.countActiveByCityAcrossIndia().stream()
                .filter(r -> states.containsKey((String) r[1]))
                .map(r -> {
                    State state = states.get((String) r[1]);
                    return new com.indiaschoolfinder.dto.location.IndiaCityDto((String) r[0], SlugUtil.toSlug((String) r[0]),
                            state.getCode(), state.getName(), state.getSlug(), ((Number) r[2]).longValue());
                })
                .toList();
    }

    @Override
    public List<String> localities(String stateCodeOrSlug) {
        if (stateCodeOrSlug == null || stateCodeOrSlug.isBlank()) {
            return schoolRepository.findDistinctLocalities();
        }
        return schoolRepository.findDistinctLocalities(requireState(stateCodeOrSlug).getCode());
    }

    @Override
    public String resolveStateCode(String codeOrName, String field) {
        if (codeOrName == null || codeOrName.isBlank()) {
            throw new BusinessValidationException(field, "a state or union territory is required");
        }
        return findStateCode(codeOrName).orElseThrow(() -> new BusinessValidationException(field,
                "unknown state/UT '" + codeOrName.trim() + "' (use an ISO code such as UP or the full name)"));
    }

    @Override
    public Optional<String> findStateCode(String codeOrName) {
        if (codeOrName == null || codeOrName.isBlank()) {
            return Optional.empty();
        }
        String value = codeOrName.trim();
        return stateRepository.findByCode(value.toUpperCase(Locale.ROOT))
                .or(() -> stateRepository.findByNameIgnoreCase(value))
                .or(() -> stateRepository.findBySlug(SlugUtil.toSlug(value)))
                .map(State::getCode);
    }

    @Override
    @Transactional
    public District findOrCreateDistrict(String stateCode, String name) {
        String clean = InputSanitizer.clean(name);
        if (clean == null || clean.isBlank()) {
            throw new BusinessValidationException("district", "must not be blank");
        }
        String normalized = clean.replaceAll("\\s+", " ").trim();
        return districtRepository.findByStateCodeAndNameIgnoreCase(stateCode, normalized)
                .orElseGet(() -> {
                    District district = new District();
                    district.setStateCode(stateCode);
                    district.setName(normalized);
                    district.setSlug(uniqueDistrictSlug(stateCode, normalized));
                    District saved = districtRepository.save(district);
                    auditService.record("DISTRICT_CREATED", "DISTRICT", saved.getId(),
                            "state=" + stateCode + ", name=" + normalized);
                    return saved;
                });
    }

    @Override
    public Map<String, State> statesByCode() {
        return stateRepository.findAll().stream().collect(Collectors.toMap(State::getCode, Function.identity()));
    }

    @Override
    public Map<Long, District> districtsById(Collection<Long> ids) {
        if (ids.isEmpty()) {
            return Map.of();
        }
        return districtRepository.findByIdIn(ids).stream().collect(Collectors.toMap(District::getId, Function.identity()));
    }

    @Override
    public List<PlaceSuggestion> suggestPlaces(String q, int limit) {
        String term = q == null ? "" : q.trim().toLowerCase(Locale.ROOT);
        if (term.length() < 2) {
            return List.of();
        }
        String pattern = "%" + term.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%";
        Map<String, State> states = statesByCode();
        List<PlaceSuggestion> places = new ArrayList<>();
        states.values().stream()
                .filter(s -> s.getName().toLowerCase(Locale.ROOT).contains(term) || s.getCode().equalsIgnoreCase(term))
                .sorted((a, b) -> Boolean.compare(!a.getName().toLowerCase(Locale.ROOT).startsWith(term),
                        !b.getName().toLowerCase(Locale.ROOT).startsWith(term)))
                .forEach(s -> places.add(
                        new PlaceSuggestion("STATE", s.getName(), s.getCode(), s.getName(), s.getSlug(), null, null)));
        for (District d : districtRepository.search(pattern, PageRequest.of(0, limit))) {
            State state = states.get(d.getStateCode());
            places.add(new PlaceSuggestion("DISTRICT", d.getName() + " district", state.getCode(), state.getName(),
                    state.getSlug(), d.getSlug(), null));
        }
        for (Object[] row : schoolRepository.searchCities(pattern, PageRequest.of(0, limit))) {
            String city = (String) row[0];
            State state = states.get((String) row[1]);
            // "Delhi" the city would only repeat "Delhi" the territory.
            if (!city.equalsIgnoreCase(state.getName())) {
                places.add(new PlaceSuggestion("CITY", city, state.getCode(), state.getName(), state.getSlug(), null, city));
            }
        }
        return places.subList(0, Math.min(limit, places.size()));
    }

    // ---------------------------------------------------------------------------------------------

    private State requireState(String codeOrSlug) {
        String value = codeOrSlug == null ? "" : codeOrSlug.trim();
        return stateRepository.findByCode(value.toUpperCase(Locale.ROOT))
                .or(() -> stateRepository.findBySlug(value.toLowerCase(Locale.ROOT)))
                .orElseThrow(() -> new ResourceNotFoundException("State", value));
    }

    private String uniqueDistrictSlug(String stateCode, String name) {
        String base = SlugUtil.toSlug(name);
        String candidate = base;
        int suffix = 2;
        while (districtRepository.existsByStateCodeAndSlug(stateCode, candidate)) {
            candidate = base + "-" + suffix++;
        }
        return candidate;
    }

    private static StateDto toDto(State s, long count) {
        return new StateDto(s.getCode(), s.getName(), s.getSlug(), s.getKind(), count);
    }
}
