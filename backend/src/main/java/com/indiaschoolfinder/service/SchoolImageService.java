package com.indiaschoolfinder.service;

import com.indiaschoolfinder.dto.school.ImageAdminDtos.ApproveRequest;
import com.indiaschoolfinder.dto.school.ImageAdminDtos.ImageCandidate;
import com.indiaschoolfinder.dto.school.ImageAdminDtos.RejectRequest;
import com.indiaschoolfinder.dto.school.ImageAdminDtos.UpdateRequest;
import com.indiaschoolfinder.dto.school.ImageDto;
import com.indiaschoolfinder.dto.school.ImageRequest;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

public interface SchoolImageService {

    /** Every image of the school, including those awaiting permission (admin use). */
    List<ImageDto> listAll(Long schoolId);

    /** Registers an externally hosted, licensed image (URL + metadata only). */
    ImageDto register(Long schoolId, ImageRequest request);

    /** Uploads the binary to the configured storage provider, then registers it. */
    ImageDto upload(Long schoolId, MultipartFile file, ImageRequest metadata);

    void delete(Long schoolId, Long imageId);

    /** Possible photographs from Wikimedia Commons and Wikipedia; a blank query searches the school's name and city. */
    List<ImageCandidate> candidates(Long schoolId, String query, int limit);

    /** Edits the details; a changed licence or permission sends a published image back to PENDING. */
    ImageDto update(Long schoolId, Long imageId, UpdateRequest request);

    /** Publishes the image under a publishable permission and records today's verification. */
    ImageDto approve(Long schoolId, Long imageId, ApproveRequest request);

    /** Takes the image down (REVOKED) and records why. */
    ImageDto reject(Long schoolId, Long imageId, RejectRequest request);

    /** Makes the image the first one shown (the card and gallery cover). */
    List<ImageDto> makePrimary(Long schoolId, Long imageId);

    /**
     * Re-reads a Wikimedia Commons image's record: fills in size, thumbnail, author and title, and sends the image back
     * to PENDING if its licence has changed or no longer allows reuse.
     */
    ImageDto refreshFromSource(Long schoolId, Long imageId);
}
