package com.indiaschoolfinder.service.impl;

import com.indiaschoolfinder.dto.school.ImageAdminDtos.ApproveRequest;
import com.indiaschoolfinder.dto.school.ImageAdminDtos.ImageCandidate;
import com.indiaschoolfinder.dto.school.ImageAdminDtos.RejectRequest;
import com.indiaschoolfinder.dto.school.ImageAdminDtos.UpdateRequest;
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
import com.indiaschoolfinder.service.ImageDiscoveryService;
import com.indiaschoolfinder.service.ImageStorageService;
import com.indiaschoolfinder.service.SchoolImageService;
import com.indiaschoolfinder.util.InputSanitizer;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class SchoolImageServiceImpl implements SchoolImageService {

    /** "https://commons.wikimedia.org/wiki/File:Netarhat_School.jpg" → "File:Netarhat_School.jpg" */
    private static final Pattern COMMONS_FILE = Pattern.compile("^https?://commons\\.wikimedia\\.org/wiki/(File:[^?#]+)");

    private final SchoolImageRepository imageRepository;
    private final SchoolRepository schoolRepository;
    private final ImageStorageService storage;
    private final SchoolMapper mapper;
    private final AuditService auditService;
    private final TransactionTemplate transactionTemplate;
    private final com.indiaschoolfinder.service.ProfileScoreService profileScoreService;
    private final ImageDiscoveryService discovery;
    private final Clock clock;

    public SchoolImageServiceImpl(SchoolImageRepository imageRepository, SchoolRepository schoolRepository,
                                  ImageStorageService storage, SchoolMapper mapper, AuditService auditService,
                                  TransactionTemplate transactionTemplate,
                                  com.indiaschoolfinder.service.ProfileScoreService profileScoreService,
                                  ImageDiscoveryService discovery, Clock clock) {
        this.profileScoreService = profileScoreService;
        this.transactionTemplate = transactionTemplate;
        this.imageRepository = imageRepository;
        this.schoolRepository = schoolRepository;
        this.storage = storage;
        this.mapper = mapper;
        this.auditService = auditService;
        this.discovery = discovery;
        this.clock = clock;
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
        return save(schoolId, request, request.url().trim(), null, request.width(), request.height());
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
        SchoolImage image = find(schoolId, imageId);
        imageRepository.delete(image);
        schoolRepository.findById(schoolId)
                .filter(s -> image.getUrl().equals(s.getLogoUrl()))
                .ifPresent(s -> s.setLogoUrl(null));
        imageRepository.flush();
        profileScoreService.recompute(schoolId);
        auditService.record("IMAGE_DELETED", "IMAGE", imageId, "school=" + schoolId + ", url=" + image.getUrl());
    }

    /** The remote search runs outside any transaction; only the duplicate check reads the database. */
    @Override
    public List<ImageCandidate> candidates(Long schoolId, String query, int limit) {
        School school = schoolRepository.findById(schoolId).orElseThrow(() -> new ResourceNotFoundException("School", schoolId));
        String q = InputSanitizer.clean(query);
        if (q == null) {
            q = school.getCity() == null ? school.getName() : school.getName() + " " + school.getCity();
        }
        Set<String> known = new HashSet<>();
        for (SchoolImage i : imageRepository.findBySchoolIdOrderBySortOrderAscIdAsc(schoolId)) {
            known.add(i.getUrl());
            known.add(i.getSourceUrl());
        }
        return discovery.search(q, limit).stream()
                .map(c -> known.contains(c.imageUrl()) || known.contains(c.pageUrl()) ? withAdded(c) : c)
                .toList();
    }

    @Override
    @Transactional
    public ImageDto update(Long schoolId, Long imageId, UpdateRequest r) {
        SchoolImage image = find(schoolId, imageId);
        ImagePermission before = image.getPermissionStatus();
        String licence = InputSanitizer.clean(r.license());
        boolean basisChanged = r.permissionStatus() != before || !Objects.equals(licence, image.getLicense())
                || !Objects.equals(InputSanitizer.clean(r.permissionNote()), image.getPermissionNote());
        if (r.permissionStatus() != before && r.permissionStatus().publishable()) {
            throw new BusinessValidationException("permissionStatus", "use Approve to publish the image under this permission");
        }
        if (r.imageType() == ImageType.LOGO && image.isIllustrative()) {
            throw new BusinessValidationException("imageType", "a logo identifies the real school and cannot be an illustration");
        }
        image.setImageType(r.imageType());
        image.setCaption(InputSanitizer.clean(r.caption()));
        image.setAltText(InputSanitizer.clean(r.altText()));
        image.setAuthor(InputSanitizer.clean(r.author()));
        image.setTitle(InputSanitizer.clean(r.title()));
        image.setCredit(InputSanitizer.clean(r.credit()));
        image.setLicense(licence);
        image.setAttributionText(InputSanitizer.clean(r.attributionText()));
        image.setPermissionNote(InputSanitizer.clean(r.permissionNote()));
        // A published image whose basis for publishing changed must be checked again before it is shown.
        image.setPermissionStatus(basisChanged && before.publishable() ? ImagePermission.PENDING : r.permissionStatus());
        if (basisChanged) {
            image.setVerificationStatus(VerificationStatus.UNVERIFIED);
        }
        return finish(image, "IMAGE_UPDATED", "permission " + before + " -> " + image.getPermissionStatus());
    }

    @Override
    @Transactional
    public ImageDto approve(Long schoolId, Long imageId, ApproveRequest r) {
        SchoolImage image = find(schoolId, imageId);
        if (!r.permissionStatus().publishable()) {
            throw new BusinessValidationException("permissionStatus", "choose the permission under which the image is published");
        }
        String note = InputSanitizer.clean(r.note());
        if (r.permissionStatus() == ImagePermission.OPEN_LICENCE && image.getAttributionText() == null) {
            throw new BusinessValidationException("attributionText",
                    "add the attribution the licence requires before approving, e.g. \"Jane Doe, CC BY-SA 4.0, via Wikimedia Commons\"");
        }
        if (r.permissionStatus() == ImagePermission.WRITTEN_PERMISSION && note == null && image.getPermissionNote() == null) {
            throw new BusinessValidationException("note", "record who granted permission and when");
        }
        if (note != null) {
            image.setPermissionNote(note);
        }
        image.setPermissionStatus(r.permissionStatus());
        image.setVerificationStatus(VerificationStatus.VERIFIED);
        image.setLastVerifiedDate(LocalDate.now(clock));
        return finish(image, "IMAGE_APPROVED", "permission=" + r.permissionStatus());
    }

    @Override
    @Transactional
    public ImageDto reject(Long schoolId, Long imageId, RejectRequest r) {
        SchoolImage image = find(schoolId, imageId);
        String reason = InputSanitizer.clean(r.reason());
        image.setPermissionStatus(ImagePermission.REVOKED);
        image.setVerificationStatus(VerificationStatus.DISPUTED);
        image.setLastVerifiedDate(LocalDate.now(clock));
        image.setPermissionNote(truncate("Rejected: " + reason, 500));
        return finish(image, "IMAGE_REJECTED", "reason=" + reason);
    }

    @Override
    @Transactional
    public List<ImageDto> makePrimary(Long schoolId, Long imageId) {
        SchoolImage primary = find(schoolId, imageId);
        List<SchoolImage> ordered = new ArrayList<>(imageRepository.findBySchoolIdOrderBySortOrderAscIdAsc(schoolId));
        ordered.remove(primary);
        ordered.addFirst(primary);
        for (int i = 0; i < ordered.size(); i++) {
            ordered.get(i).setSortOrder(i);
        }
        imageRepository.flush();
        profileScoreService.recompute(schoolId);
        auditService.record("IMAGE_PRIMARY", "IMAGE", imageId, "school=" + schoolId);
        return ordered.stream().map(mapper::toImageDto).toList();
    }

    @Override
    @Transactional
    public ImageDto refreshFromSource(Long schoolId, Long imageId) {
        SchoolImage image = find(schoolId, imageId);
        Matcher m = COMMONS_FILE.matcher(image.getSourceUrl());
        if (!m.find()) {
            throw new BusinessValidationException("sourceUrl", "only images whose source is a Wikimedia Commons file page can be refreshed");
        }
        String file = URLDecoder.decode(m.group(1), StandardCharsets.UTF_8).replace('_', ' ');
        ImageCandidate c = discovery.commonsFile(file)
                .orElseThrow(() -> new BusinessValidationException("sourceUrl", "Wikimedia Commons no longer has " + file));
        image.setWidth(c.width());
        image.setHeight(c.height());
        if (c.thumbnailUrl() != null) image.setThumbnailUrl(c.thumbnailUrl());
        if (image.getAuthor() == null) image.setAuthor(truncate(c.author(), 200));
        if (image.getTitle() == null) image.setTitle(truncate(c.title(), 300));
        String change = "unchanged licence";
        if (c.suggestedPermission() == null || !sameLicence(c.licence(), image.getLicense())) {
            change = "licence now " + c.licence();
            if (image.getPermissionStatus().publishable()) {
                image.setPermissionStatus(ImagePermission.PENDING);
            }
            image.setVerificationStatus(VerificationStatus.OUTDATED);
        }
        return finish(image, "IMAGE_REFRESHED", change);
    }

    /** "CC BY-SA 4.0" matches "cc-by-sa-4.0"; a stored licence that names the short one also matches. */
    static boolean sameLicence(String source, String stored) {
        if (source == null || stored == null) return false;
        String a = source.toLowerCase().replaceAll("[^a-z0-9.]", "");
        String b = stored.toLowerCase().replaceAll("[^a-z0-9.]", "");
        return b.contains(a);
    }

    private SchoolImage find(Long schoolId, Long imageId) {
        return imageRepository.findById(imageId)
                .filter(i -> i.getSchoolId().equals(schoolId))
                .orElseThrow(() -> new ResourceNotFoundException("Image", imageId));
    }

    /** Keeps the school's logo in step with its logo image, then records the change. */
    private ImageDto finish(SchoolImage image, String action, String detail) {
        schoolRepository.findById(image.getSchoolId()).ifPresent(school -> {
            boolean isLogo = image.getUrl().equals(school.getLogoUrl());
            if (image.getImageType() == ImageType.LOGO && image.getPermissionStatus().publishable()) {
                school.setLogoUrl(image.getUrl());
            } else if (isLogo) {
                school.setLogoUrl(null);
            }
        });
        imageRepository.flush();
        profileScoreService.recompute(image.getSchoolId());
        auditService.record(action, "IMAGE", image.getId(), "school=" + image.getSchoolId() + ", " + detail);
        return mapper.toImageDto(image);
    }

    private static ImageCandidate withAdded(ImageCandidate c) {
        return new ImageCandidate(c.source(), c.title(), c.pageUrl(), c.imageUrl(), c.thumbnailUrl(), c.width(),
                c.height(), c.mime(), c.author(), c.licence(), c.licenceUrl(), c.attributionRequired(), c.description(),
                c.suggestedPermission(), c.attributionText(), true);
    }

    private static String truncate(String s, int max) {
        return s == null || s.length() <= max ? s : s.substring(0, max - 1) + "…";
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
        image.setAuthor(InputSanitizer.clean(r.author()));
        image.setTitle(InputSanitizer.clean(r.title()));
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
