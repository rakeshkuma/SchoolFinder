package com.indiaschoolfinder.service;

import org.springframework.web.multipart.MultipartFile;

/** Stores image binaries outside PostgreSQL and returns the public URL plus metadata. */
public interface ImageStorageService {

    boolean isEnabled();

    StoredImage upload(MultipartFile file, Long schoolId);

    record StoredImage(String url, String publicId, Integer width, Integer height) {
    }
}
