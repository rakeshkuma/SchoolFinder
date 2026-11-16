package com.indiaschoolfinder.service;

import com.indiaschoolfinder.enums.SchoolNetwork;
import com.indiaschoolfinder.exception.ResourceNotFoundException;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** Title length (Google shows about 60 characters) and the network page addresses. */
class SeoHeadTitleTest {

    @Test
    void keepsTheSiteNameOnlyWhileTheTitleFitsInSixtyCharacters() {
        assertThat(SeoHeadService.fitTitle("Schools in Bihar | SchoolDhundo")).isEqualTo("Schools in Bihar | SchoolDhundo");
        // 66 characters with the suffix: Ubersuggest flagged these as too long; the place and topic are what matter.
        assertThat(SeoHeadService.fitTitle("Best Schools in Dehradun: Rankings & School Lists | SchoolDhundo"))
                .isEqualTo("Best Schools in Dehradun: Rankings & School Lists");
        // A title without the suffix is never cut.
        String long_ = "A".repeat(80);
        assertThat(SeoHeadService.fitTitle(long_)).isEqualTo(long_);
        assertThat(SeoHeadService.DEFAULT_TITLE.length()).isLessThanOrEqualTo(SeoHeadService.TITLE_MAX);
    }

    @Test
    void networkSlugsAreTheEnumNamesInKebabCase() {
        assertThat(SeoHeadService.network("sainik-school")).isEqualTo(SchoolNetwork.SAINIK_SCHOOL);
        assertThat(SeoHeadService.network("jawahar-navodaya-vidyalaya")).isEqualTo(SchoolNetwork.JAWAHAR_NAVODAYA_VIDYALAYA);
        assertThat(SeoHeadService.network("eklavya-model-residential-school")).isEqualTo(SchoolNetwork.EKLAVYA_MODEL_RESIDENTIAL_SCHOOL);
        assertThatThrownBy(() -> SeoHeadService.network("no-such-network")).isInstanceOf(ResourceNotFoundException.class);
        assertThat(SeoHeadService.networkCriteria(SchoolNetwork.KENDRIYA_VIDYALAYA, 5).network()).isEqualTo(SchoolNetwork.KENDRIYA_VIDYALAYA);
        assertThat(SeoHeadService.networkCriteria(SchoolNetwork.KENDRIYA_VIDYALAYA, 5).sortBy()).isEqualTo("recommended");
    }
}
