package com.indiaschoolfinder.service.impl;

import com.indiaschoolfinder.dto.school.ImageDto;
import com.indiaschoolfinder.dto.school.ImageRequest;
import com.indiaschoolfinder.entity.School;
import com.indiaschoolfinder.entity.SchoolImage;
import com.indiaschoolfinder.enums.ImagePermission;
import com.indiaschoolfinder.enums.ImageType;
import com.indiaschoolfinder.enums.VerificationStatus;
import com.indiaschoolfinder.exception.BusinessValidationException;
import com.indiaschoolfinder.exception.ResourceNotFoundException;
import com.indiaschoolfinder.mapper.SchoolMapper;
import com.indiaschoolfinder.repository.SchoolImageRepository;
import com.indiaschoolfinder.repository.SchoolRepository;
import com.indiaschoolfinder.service.AuditService;
import com.indiaschoolfinder.service.ImageStorageService;
import com.indiaschoolfinder.service.SchoolImageService;
import com.indiaschoolfinder.util.InputSanitizer;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@Service
public class SchoolImageServiceImpl implements SchoolImageService {

    private final SchoolImageRepository imageRepository;
    private final SchoolRepository schoolRepository;
    private final ImageStorageService storage;
    private final SchoolMapper mapper;
    private final AuditService auditService;
    private final TransactionTemplate transactionTemplate;
    private final com.indiaschoolfinder.service.ProfileScoreService profileScoreService;

    public SchoolImageServiceImpl(SchoolImageRepository imageRepository, SchoolRepository schoolRepository,
                                  ImageStorageService storage, SchoolMapper mapper, AuditService auditService,
                                  TransactionTemplate transactionTemplate,
                                  com.indiaschoolfinder.service.ProfileScoreService profileScoreService) {
        this.profileScoreService = profileScoreService;
        this.transactionTemplate = transactionTemplate;
        this.imageRepository = imageRepository;
        this.schoolRepository = schoolRepository;
        this.storage = storage;
        this.mapper = mapper;
        this.auditService = auditService;
    }

    @Override
    @Transactional(readOnly = true)
    public List<ImageDto> listAll(Long schoolId) {
        if (!schoolRepository.existsById(schoolId)) {
            throw new ResourceNotFoundException("School", schoolId);
        }
        return imageRepository.findBySchoolIdOrderBySortOrderAscIdAsc(schoolId).stream().map(mapper::toImageDto).toList();
    }

    @Override
    @Transactional
    public ImageDto register(Long schoolId, ImageRequest request) {
        return save(schoolId, request, request.url().trim(), null, null, null);
    }

    /**
     * The upload happens before the transaction opens so a slow provider never holds a DB connection.
     * If the DB insert then fails the orphaned file stays in storage and can be cleaned up from there.
     */
    @Override
    public ImageDto upload(Long schoolId, MultipartFile file, ImageRequest metadata) {
        if (!schoolRepository.existsById(schoolId)) {
            throw new ResourceNotFoundException("School", schoolId);
        }
        checkPermission(metadata);
        ImageStorageService.StoredImage stored = storage.upload(file, schoolId);
        return transactionTemplate.execute(status ->
                save(schoolId, metadata, stored.url(), stored.publicId(), stored.width(), stored.height()));
    }

    @Override
    @Transactional
    public void delete(Long schoolId, Long imageId) {
        SchoolImage image = imageRepository.findById(imageId)
                .filter(i -> i.getSchoolId().equals(schoolId))
                .orElseThrow(() -> new ResourceNotFoundException("Image", imageId));
        imageRepository.delete(image);
        schoolRepository.findById(schoolId)
                .filter(s -> image.getUrl().equals(s.getLogoUrl()))
                .ifPresent(s -> s.setLogoUrl(null));
        imageRepository.flush();
        profileScoreService.recompute(schoolId);
        auditService.record("IMAGE_DELETED", "IMAGE", imageId, "school=" + schoolId + ", url=" + image.getUrl());
    }

    /** Licence conditions that a single field annotation cannot express. */
    private static void checkPermission(ImageRequest r) {
        boolean illustrative = Boolean.TRUE.equals(r.illustrative());
        if (illustrative && r.imageType() == ImageType.LOGO) {
            throw new BusinessValidationException("illustrative", "a logo identifies the real school and cannot be an illustration");
        }
        if (r.permissionStatus() == ImagePermission.OPEN_LICENCE && InputSanitizer.clean(r.attributionText()) == null) {
            throw new BusinessValidationException("attributionText",
                    "open licences require attribution, e.g. \"Jane Doe, CC BY-SA 4.0, via Wikimedia Commons\"");
        }
        if (r.permissionStatus() == ImagePermission.WRITTEN_PERMISSION && InputSanitizer.clean(r.permissionNote()) == null) {
            throw new BusinessValidationException("permissionNote", "record who granted permission and when");
        }
    }

    private ImageDto save(Long schoolId, ImageRequest r, String url, String publicId, Integer width, Integer height) {
        checkPermission(r);
        School school = schoolRepository.findById(schoolId).orElseThrow(() -> new ResourceNotFoundException("School", schoolId));
        SchoolImage image = new SchoolImage();
        image.setSchoolId(schoolId);
        image.setImageType(r.imageType());
        image.setUrl(url);
        image.setThumbnailUrl(r.thumbnailUrl() == null || r.thumbnailUrl().isBlank() ? null : r.thumbnailUrl().trim());
        image.setStoragePublicId(publicId);
        image.setCaption(InputSanitizer.clean(r.caption()));
        image.setAltText(InputSanitizer.clean(r.altText()));
        image.setCredit(InputSanitizer.clean(r.credit()));
        image.setLicense(InputSanitizer.clean(r.license()));
        image.setAttributionText(InputSanitizer.clean(r.attributionText()));
        image.setPermissionStatus(r.permissionStatus());
        image.setPermissionNote(InputSanitizer.clean(r.permissionNote()));
        image.setIllustrative(Boolean.TRUE.equals(r.illustrative()));
        image.setSourceUrl(r.sourceUrl().trim());
        image.setWidth(width);
        image.setHeight(height);
        image.setSortOrder(r.sortOrder() == null ? 0 : r.sortOrder());
        image.setVerificationStatus(VerificationStatus.UNVERIFIED);
        SchoolImage saved = imageRepository.save(image);
        // The school's logo is shown on every card, so only a logo cleared for publication becomes it.
        if (r.imageType() == ImageType.LOGO && r.permissionStatus().publishable()) {
            school.setLogoUrl(url);
            schoolRepository.save(school);
        }
        auditService.record("IMAGE_ADDED", "IMAGE", saved.getId(),
                "school=" + schoolId + ", license=" + r.license() + ", permission=" + r.permissionStatus());
        imageRepository.flush();
        profileScoreService.recompute(schoolId); // a cleared photo moves the school up the recommended order
        return mapper.toImageDto(saved);
    }
}
