package com.indiaschoolfinder.service;

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
}
