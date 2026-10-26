package com.indiaschoolfinder.service.impl;

import com.indiaschoolfinder.config.AppProperties;
import com.indiaschoolfinder.exception.BusinessValidationException;
import com.indiaschoolfinder.exception.ServiceUnavailableException;
import com.indiaschoolfinder.service.ImageStorageService;
import com.fasterxml.jackson.databind.JsonNode;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Clock;
import java.util.HexFormat;
import java.util.Set;

/**
 * Signed upload to the Cloudinary Upload API (https://cloudinary.com/documentation/image_upload_api_reference).
 * Enabled only when CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET are set;
 * otherwise administrators register externally hosted image URLs instead.
 */
@Slf4j
@Service
public class CloudinaryImageStorageService implements ImageStorageService {

    private static final Set<String> ALLOWED_TYPES = Set.of(MediaType.IMAGE_JPEG_VALUE, MediaType.IMAGE_PNG_VALUE, "image/webp");

    private final AppProperties.Cloudinary config;
    private final RestClient restClient;
    private final Clock clock;

    public CloudinaryImageStorageService(AppProperties properties, RestClient.Builder builder, Clock clock) {
        this.config = properties.getCloudinary();
        this.restClient = builder.baseUrl("https://api.cloudinary.com/v1_1").build();
        this.clock = clock;
    }

    @Override
    public boolean isEnabled() {
        return config.isConfigured();
    }

    @Override
    public StoredImage upload(MultipartFile file, Long schoolId) {
        if (!isEnabled()) {
            throw new ServiceUnavailableException("Image upload is not configured. Register an officially hosted or "
                    + "licensed image URL instead, or set the Cloudinary environment variables.");
        }
        validate(file);
        String folder = config.getFolder() + "/schools/" + schoolId;
        long timestamp = clock.instant().getEpochSecond();
        // Parameters are signed in alphabetical order: folder, timestamp.
        String signature = sha1Hex("folder=" + folder + "&timestamp=" + timestamp + config.getApiSecret());

        MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
        try {
            byte[] bytes = file.getBytes();
            body.add("file", new ByteArrayResource(bytes) {
                @Override
                public String getFilename() {
                    return file.getOriginalFilename() == null ? "upload" : file.getOriginalFilename();
                }
            });
        } catch (IOException e) {
            throw new BusinessValidationException("file", "could not read the uploaded file");
        }
        body.add("api_key", config.getApiKey());
        body.add("timestamp", String.valueOf(timestamp));
        body.add("folder", folder);
        body.add("signature", signature);

        try {
            JsonNode response = restClient.post()
                    .uri("/{cloud}/image/upload", config.getCloudName())
                    .contentType(MediaType.MULTIPART_FORM_DATA)
                    .body(body)
                    .retrieve()
                    .body(JsonNode.class);
            if (response == null || !response.hasNonNull("secure_url")) {
                throw new ServiceUnavailableException("Image storage returned an unexpected response");
            }
            return new StoredImage(response.get("secure_url").asText(), response.path("public_id").asText(null),
                    response.hasNonNull("width") ? response.get("width").asInt() : null,
                    response.hasNonNull("height") ? response.get("height").asInt() : null);
        } catch (RestClientException e) {
            log.warn("Cloudinary upload failed for school {}: {}", schoolId, e.getMessage());
            throw new ServiceUnavailableException("Image storage is unavailable; please try again later", e);
        }
    }

    private void validate(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BusinessValidationException("file", "an image file is required");
        }
        if (file.getSize() > config.getMaxUploadBytes()) {
            throw new BusinessValidationException("file", "image must be at most " + (config.getMaxUploadBytes() / (1024 * 1024)) + " MB");
        }
        if (file.getContentType() == null || !ALLOWED_TYPES.contains(file.getContentType())) {
            throw new BusinessValidationException("file", "only JPEG, PNG or WebP images are accepted");
        }
    }

    static String sha1Hex(String value) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-1").digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }
}
