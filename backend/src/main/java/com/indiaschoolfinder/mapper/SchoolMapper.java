package com.indiaschoolfinder.mapper;

import com.indiaschoolfinder.dto.reference.EducationBoardDto;
import com.indiaschoolfinder.dto.reference.SchoolClassDto;
import com.indiaschoolfinder.dto.school.BoardingProfileDto;
import com.indiaschoolfinder.dto.school.FacilityDto;
import com.indiaschoolfinder.dto.school.ImageDto;
import com.indiaschoolfinder.dto.school.SchoolDetailDto;
import com.indiaschoolfinder.dto.school.SchoolRequest;
import com.indiaschoolfinder.dto.school.SchoolSummaryDto;
import com.indiaschoolfinder.entity.District;
import com.indiaschoolfinder.entity.EducationBoard;
import com.indiaschoolfinder.entity.School;
import com.indiaschoolfinder.entity.SchoolBoarding;
import com.indiaschoolfinder.entity.State;
import com.indiaschoolfinder.entity.SchoolClass;
import com.indiaschoolfinder.entity.SchoolFacility;
import com.indiaschoolfinder.entity.SchoolImage;
import com.indiaschoolfinder.util.InputSanitizer;
import org.springframework.stereotype.Component;

import java.util.Comparator;
import java.util.List;
import java.util.Map;

/** Hand-written mapping keeps entity ↔ DTO conversion explicit and free of reflection surprises. */
@Component
public class SchoolMapper {

    /** Fee/admission/boarding highlights shown on cards; any part may be null. */
    public record Highlights(java.math.BigDecimal annualFeeFrom, String annualFeeYear,
                             com.indiaschoolfinder.enums.AdmissionStatus admissionStatus, SchoolBoarding boarding,
                             String classesFrom, String classesTo,
                             List<com.indiaschoolfinder.enums.FacilityCategory> facilityCategories) {
        public static final Highlights NONE = new Highlights(null, null, null, null, null, null, List.of());
    }

    /** State and district rows a batch of summaries refers to, loaded once per batch. */
    public record Places(Map<String, State> states, Map<Long, District> districts) {
        String stateName(String code) {
            State state = states.get(code);
            return state == null ? null : state.getName();
        }

        String districtName(Long id) {
            District district = id == null ? null : districts.get(id);
            return district == null ? null : district.getName();
        }
    }

    public SchoolSummaryDto toSummary(School s, SchoolImage cover, Double distanceKm, Places places) {
        return toSummary(s, cover, distanceKm, Highlights.NONE, places);
    }

    public SchoolSummaryDto toSummary(School s, SchoolImage cover, Double distanceKm, Highlights h, Places places) {
        SchoolBoarding b = h.boarding();
        return new SchoolSummaryDto(
                s.getId(), s.getName(), s.getSlug(), s.getSchoolType(), s.getManagement(), s.getNetwork(),
                s.getEducationBoardCode(), s.getLocality(), s.getCity(), places.districtName(s.getDistrictId()),
                s.getStateCode(), places.stateName(s.getStateCode()), s.getPinCode(), s.getHasHostel(), s.getLogoUrl(),
                cover == null ? null : cover.getThumbnailUrl() != null ? cover.getThumbnailUrl() : cover.getUrl(),
                cover == null ? null : cover.isIllustrative() ? "Illustration, not a photo of this school" : cover.getCredit(),
                s.getAverageRating(), s.getReviewCount(), s.getLatitude(), s.getLongitude(),
                distanceKm == null ? null : Math.round(distanceKm * 100.0) / 100.0,
                s.getVerificationStatus(), s.getLastVerifiedDate(),
                h.annualFeeFrom(), h.annualFeeYear(), h.admissionStatus(),
                s.getGenderType(), s.getWebsiteUrl(),
                b == null ? null : b.getBoardingType(), b == null ? null : b.getResidentialSystem(),
                b == null ? null : b.getEntranceExam(), b == null ? null : b.getEntryClasses(),
                b == null ? null : b.getSummary(), b == null ? null : b.getVerificationStatus(),
                h.classesFrom(), h.classesTo(), h.facilityCategories(), s.getAdmissionPortalUrl(),
                s.getSourceRetrievedDate(), cover != null && cover.isIllustrative());
    }

    public SchoolDetailDto toDetail(School s, EducationBoard board, State state, District district, SchoolBoarding boarding) {
        List<SchoolClassDto> classes = s.getClassesOffered().stream()
                .sorted(Comparator.comparingInt(SchoolClass::getSortOrder))
                .map(this::toClassDto)
                .toList();
        return new SchoolDetailDto(
                s.getId(), s.getName(), s.getSlug(), s.getDescription(), s.getSchoolType(),
                s.getManagement(), s.getNetwork(),
                board == null ? null : toBoardDto(board), s.getAffiliationNumber(), s.getUdiseCode(),
                s.getPrincipalName(), s.getManagingBody(),
                s.getGenderType(), s.getMediumOfInstruction(), classes,
                s.getWebsiteUrl(), s.getAdmissionPortalUrl(), s.getPhone(), s.getEmail(),
                s.getAddressLine(), s.getLocality(), s.getCity(),
                district == null ? null : new SchoolDetailDto.DistrictRef(district.getName(), district.getSlug()),
                s.getStateCode(), state == null ? null : state.getName(), state == null ? null : state.getSlug(),
                s.getPinCode(),
                s.getLatitude(), s.getLongitude(), s.getStudentTeacherRatio(), s.getSchoolTimings(),
                s.getEstablishedYear(), s.getHasTransport(), s.getHasHostel(), s.getAccessibilityFeatures(),
                s.getLogoUrl(), s.getAverageRating(), s.getReviewCount(), s.getSourceUrl(),
                s.getSourceRetrievedDate(), s.getVerificationStatus(), s.getLastVerifiedDate(),
                s.isActive(), s.getVersion(), s.getUpdatedAt(), boarding == null ? null : toBoardingDto(boarding));
    }

    /**
     * Copies only the editable fields of the request; protected fields are never touched.
     * State and district need reference lookups and are set by the service.
     */
    public void applyRequest(SchoolRequest r, School s) {
        s.setName(InputSanitizer.clean(r.name()));
        s.setDescription(InputSanitizer.clean(r.description()));
        s.setSchoolType(r.schoolType());
        s.setManagement(r.management());
        s.setNetwork(r.network());
        s.setEducationBoardCode(blankToNull(r.boardCode()) == null ? null : r.boardCode().trim().toUpperCase());
        s.setAffiliationNumber(blankToNull(r.affiliationNumber()));
        s.setUdiseCode(blankToNull(r.udiseCode()));
        s.setPrincipalName(InputSanitizer.clean(r.principalName()));
        s.setManagingBody(InputSanitizer.clean(r.managingBody()));
        s.setCity(InputSanitizer.clean(r.city()));
        s.setGenderType(r.genderType());
        s.setMediumOfInstruction(InputSanitizer.clean(r.mediumOfInstruction()));
        s.setWebsiteUrl(blankToNull(r.websiteUrl()));
        s.setAdmissionPortalUrl(blankToNull(r.admissionPortalUrl()));
        s.setPhone(InputSanitizer.clean(r.phone()));
        s.setEmail(blankToNull(r.email()) == null ? null : r.email().trim().toLowerCase());
        s.setAddressLine(InputSanitizer.clean(r.addressLine()));
        s.setLocality(InputSanitizer.clean(r.locality()));
        s.setPinCode(blankToNull(r.pinCode()));
        s.setLatitude(r.latitude());
        s.setLongitude(r.longitude());
        s.setStudentTeacherRatio(r.studentTeacherRatio());
        s.setSchoolTimings(InputSanitizer.clean(r.schoolTimings()));
        s.setEstablishedYear(r.establishedYear());
        s.setHasTransport(r.hasTransport());
        s.setHasHostel(r.hasHostel());
        s.setAccessibilityFeatures(InputSanitizer.clean(r.accessibilityFeatures()));
        s.setLogoUrl(blankToNull(r.logoUrl()));
        s.setSourceUrl(r.sourceUrl().trim());
        s.setSourceRetrievedDate(r.sourceRetrievedDate());
    }

    public SchoolClassDto toClassDto(SchoolClass c) {
        return new SchoolClassDto(c.getCode(), c.getName(), c.getStage(), c.getSortOrder());
    }

    public EducationBoardDto toBoardDto(EducationBoard b) {
        return new EducationBoardDto(b.getCode(), b.getName(), b.getWebsiteUrl(), b.getDescription());
    }

    /** The permission note can name the person who granted permission, so the public gallery leaves it out. */
    public ImageDto toPublicImageDto(SchoolImage i) {
        return toImageDto(i, false);
    }

    public ImageDto toImageDto(SchoolImage i) {
        return toImageDto(i, true);
    }

    private ImageDto toImageDto(SchoolImage i, boolean withPermissionNote) {
        return new ImageDto(i.getId(), i.getImageType(), i.getUrl(), i.getThumbnailUrl(), i.getCaption(), i.getAltText(),
                i.getCredit(), i.getLicense(), i.getAttributionText(), i.getPermissionStatus(), i.isIllustrative(),
                i.getSourceUrl(), i.getWidth(), i.getHeight(), i.getSortOrder(), i.getVerificationStatus(),
                i.getLastVerifiedDate(), i.getAuthor(), i.getTitle(), hostOf(i.getSourceUrl()),
                withPermissionNote ? i.getPermissionNote() : null,
                i.getCreatedAt());
    }

    /** "https://commons.wikimedia.org/wiki/File:X.jpg" → "commons.wikimedia.org"; null when it cannot be read. */
    static String hostOf(String url) {
        if (url == null) return null;
        try {
            String host = java.net.URI.create(url.trim()).getHost();
            return host == null ? null : host.replaceFirst("^www\\.", "");
        } catch (IllegalArgumentException e) {
            return null;
        }
    }

    public BoardingProfileDto toBoardingDto(SchoolBoarding b) {
        return new BoardingProfileDto(b.getSchoolId(), b.getBoardingType(), b.getResidentialSystem(),
                b.getResidentialSystem().isGovernment(), b.getResidentialSystem().isDefence(), b.getEntranceExam(),
                b.getEntryClasses(), b.getSummary(), b.getAccommodation(), b.getPastoralCare(), b.getDining(),
                b.getMedicalCare(), b.getNearestTransport(), b.getAcademicSession(), b.getSourceUrl(),
                b.getVerificationStatus(), b.getLastVerifiedDate());
    }

    public FacilityDto toFacilityDto(SchoolFacility f) {
        return new FacilityDto(f.getId(), f.getCategory(), f.getName(), f.getDescription(), f.getAvailable(),
                f.getSourceUrl(), f.getVerificationStatus(), f.getLastVerifiedDate());
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
