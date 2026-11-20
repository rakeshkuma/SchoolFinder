package com.indiaschoolfinder.service;

import com.indiaschoolfinder.dto.school.ImageDto;
import com.indiaschoolfinder.enums.ImageType;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/** The profile's hero photo is requested with the page, choosing exactly the file the app will show. */
class SeoHeroPreloadTest {

    private static ImageDto image(ImageType type, String url, String thumbnail) {
        ImageDto i = mock(ImageDto.class);
        when(i.imageType()).thenReturn(type);
        when(i.url()).thenReturn(url);
        when(i.thumbnailUrl()).thenReturn(thumbnail);
        return i;
    }

    @Test
    void preloadsTheFirstPhotoThatIsNotALogoWithTheSameSizesAsTheApp() {
        String link = SeoHeadService.heroPreload(List.of(
                image(ImageType.LOGO, "https://example.org/logo.png", null),
                image(ImageType.CAMPUS, "https://example.org/full.jpg?a=1&b=2", "https://example.org/thumb.jpg")));
        assertThat(link).contains("rel=\"preload\" as=\"image\"").contains("href=\"https://example.org/thumb.jpg\"")
                .contains("imagesrcset=\"https://example.org/thumb.jpg 1x, https://example.org/full.jpg?a=1&amp;b=2 2x\"")
                .doesNotContain("logo.png");
    }

    @Test
    void aPhotoWithoutAThumbnailIsPreloadedAsItIsAndNoPhotoMeansNoPreload() {
        assertThat(SeoHeadService.heroPreload(List.of(image(ImageType.CAMPUS, "https://example.org/full.jpg", null))))
                .contains("href=\"https://example.org/full.jpg\"").doesNotContain("imagesrcset");
        assertThat(SeoHeadService.heroPreload(List.of(image(ImageType.LOGO, "https://example.org/logo.png", null)))).isEmpty();
        assertThat(SeoHeadService.heroPreload(List.of())).isEmpty();
    }
}
