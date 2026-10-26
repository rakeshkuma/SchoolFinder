package com.indiaschoolfinder.dto.submission;

import com.indiaschoolfinder.enums.SubmitterRole;
import com.indiaschoolfinder.enums.UpdateTopic;
import com.indiaschoolfinder.validation.HttpUrl;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * A suggested update. The official page that states the information is required, because only sourced facts are
 * published. The e-mail is optional and only used to reply; `website` is a honeypot that people never see or fill.
 */
public record UpdateSubmissionRequest(
        @NotNull UpdateTopic topic,
        @NotBlank @Size(min = 20, max = 2000) String message,
        @NotBlank(message = "link the official page (school website, board or government page) that states this")
        @HttpUrl @Size(max = 500) String sourceUrl,
        @NotNull SubmitterRole role,
        @Email @Size(max = 200) String contactEmail,
        @Size(max = 200) String website) {
}
