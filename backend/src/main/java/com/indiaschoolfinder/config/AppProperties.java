package com.indiaschoolfinder.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

import java.math.BigDecimal;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;

/** All application-specific settings (prefix "app"). Secrets come from environment variables. */
@Getter
@Setter
@Validated
@ConfigurationProperties(prefix = "app")
public class AppProperties {

    private String timezone = "Asia/Kolkata";
    /** Public https address of the site (PUBLIC_SITE_URL), used for absolute URLs in sitemaps; blank = request host. */
    private String publicSiteUrl = "";
    private final Cors cors = new Cors();
    private final Jwt jwt = new Jwt();
    private final Ranking ranking = new Ranking();
    private final RateLimit rateLimit = new RateLimit();
    private final Seed seed = new Seed();
    private final Admin admin = new Admin();
    private final Cloudinary cloudinary = new Cloudinary();
    private final DataQuality dataQuality = new DataQuality();
    private final Exams exams = new Exams();
    private final Account account = new Account();
    private final Mail mail = new Mail();
    private final ImageDiscovery imageDiscovery = new ImageDiscovery();
    private final Ocr ocr = new Ocr();

    /**
     * Optional OCR for scanned notices under document review. Off unless tesseractCommand is set (for example "tesseract",
     * with the Hindi and English language data installed); without it, scans are flagged for the reviewer to transcribe.
     */
    @Getter
    @Setter
    public static class Ocr {
        private String tesseractCommand = "";
        private String languages = "hin+eng";
        private Duration timeout = Duration.ofSeconds(60);
        /** Pages beyond this are not rendered or read. */
        private int maxPages = 30;

        public boolean isConfigured() {
            return tesseractCommand != null && !tesseractCommand.isBlank();
        }
    }

    /**
     * Searching Wikimedia Commons and Wikipedia for possible school photographs (admin only). Results are suggestions:
     * nothing is stored until an administrator adds one, always as PENDING.
     */
    @Getter
    @Setter
    public static class ImageDiscovery {
        private boolean enabled = true;
        private String commonsApiUrl = "https://commons.wikimedia.org/w/api.php";
        private String wikipediaApiUrl = "https://en.wikipedia.org/w/api.php";
        /** Wikimedia asks API clients to identify themselves with a way to contact the operator. */
        private String userAgent = "IndiaSchoolFinder/1.0 (school image licence review; https://github.com/rakeshkuma/SchoolFinder)";
        private Duration connectTimeout = Duration.ofSeconds(5);
        private Duration readTimeout = Duration.ofSeconds(10);
        /** Width of the card thumbnail requested from Commons. */
        private int thumbnailWidth = 640;
    }

    @Getter
    @Setter
    public static class Cors {
        private List<String> allowedOrigins = new ArrayList<>();
    }

    @Getter
    @Setter
    public static class Jwt {
        /** HMAC-SHA256 key; must be at least 32 bytes. Supplied via JWT_SECRET. */
        private String secret;
        private Duration accessTokenTtl = Duration.ofMinutes(15);
        private String issuer = "india-school-finder";
    }

    @Getter
    @Setter
    public static class Ranking {
        private String methodologyVersion = "2.0";
        /** Share of total criterion weight that must be backed by verified evidence for a definitive rank. */
        private BigDecimal minCoveragePercent = new BigDecimal("70");
        private int minReviewsForParentFeedback = 5;
        /** Documented (non-score) evidence older than this is treated as outdated and not scored. */
        private int maxEvidenceAgeYears = 3;
        /** Student-teacher ratio at or below this scores 100. */
        private BigDecimal studentTeacherRatioBest = new BigDecimal("20");
        /** Student-teacher ratio at or above this scores 0. */
        private BigDecimal studentTeacherRatioWorst = new BigDecimal("40");
    }

    @Getter
    @Setter
    public static class RateLimit {
        private boolean enabled = true;
        private int loginPerMinute = 5;
        private int reviewsPerHour = 5;
        /** Suggested updates per client IP per hour. */
        private int updateSubmissionsPerHour = 10;
        /** Sign-ups, verification resends and password-reset requests/uses per client IP per hour. */
        private int accountEmailsPerHour = 10;
        private int publicWritesPerMinute = 60;
        private int suggestionsPerMinute = 120;
    }

    @Getter
    @Setter
    public static class Seed {
        private boolean enabled = false;
        private String csvLocation = "classpath:seed/delhi-schools.csv";
        /** Source-linked fee and admission payloads keyed by school name; loaded after the CSV. */
        private String feesAndAdmissionsLocation = "classpath:seed/fees-and-admissions.json";
        /** Freely licensed school photos (ImageRequest payloads keyed by school name). */
        private String imagesLocation = "classpath:seed/images.json";
    }

    @Getter
    @Setter
    public static class Admin {
        private String bootstrapUsername;
        private String bootstrapPassword;
    }

    @Getter
    @Setter
    public static class Cloudinary {
        private String cloudName;
        private String apiKey;
        private String apiSecret;
        private String folder = "india-school-finder";
        private long maxUploadBytes = 5 * 1024 * 1024;

        public boolean isConfigured() {
            return notBlank(cloudName) && notBlank(apiKey) && notBlank(apiSecret);
        }

        private static boolean notBlank(String s) {
            return s != null && !s.isBlank();
        }
    }

    @Getter
    @Setter
    public static class DataQuality {
        private int staleAfterDays = 365;
        /** States/UTs listed first on the coverage dashboard (ISO 3166-2:IN codes). */
        private List<String> priorityStates = new ArrayList<>(List.of("DL", "BR", "UP", "JH", "HR"));
    }

    /** Member accounts (parents and visitors); see README "Accounts". */
    @Getter
    @Setter
    public static class Account {
        /** Base address used in emailed links, e.g. https://indiaschoolfinder.in (falls back to public-site-url). */
        private String linkBaseUrl = "";
        /** Version of the Terms of Service and Privacy Policy that new members accept. */
        private String termsVersion = "2026-10-27";
        private Duration verificationTtl = Duration.ofHours(24);
        private Duration resetTtl = Duration.ofMinutes(30);
        /** Failed sign-ins in a row before the account is locked for {@link #lockDuration}. */
        private int maxFailedLogins = 5;
        private Duration lockDuration = Duration.ofMinutes(15);
        /** Session lifetime with "Keep me signed in"; otherwise the session ends after server.servlet.session.timeout. */
        private Duration rememberMe = Duration.ofDays(30);
        /** Members without a password (Google sign-in) must have signed in this recently to delete their account. */
        private Duration recentSignIn = Duration.ofMinutes(10);
        private final Google google = new Google();

        /**
         * "Continue with Google" (OpenID Connect). Offered only when both values are set; they come from a Google Cloud
         * OAuth client of type "Web application" (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET) and never from source code.
         */
        @Getter
        @Setter
        public static class Google {
            private String clientId = "";
            private String clientSecret = "";

            public boolean isConfigured() {
                return clientId != null && !clientId.isBlank() && clientSecret != null && !clientSecret.isBlank();
            }
        }
    }

    @Getter
    @Setter
    public static class Mail {
        /** Sender address for account email (MAIL_FROM). SMTP itself is configured with spring.mail.* properties. */
        private String from = "";
        /**
         * Development only: keep outgoing account email in memory and expose it to the local test tools instead of
         * sending it. Refused at start-up under the prod profile.
         */
        private boolean devOutbox = false;
    }

    @Getter
    @Setter
    public static class Exams {
        /** Load the verified exam catalogue file when the exam table is empty (first start of a new database). */
        private boolean seedOnEmpty = true;
        private String seedLocation = "classpath:seed/exams.json";
        /** India School Finder practice quizzes and mock tests, loaded with the exam catalogue. */
        private String practiceSeedLocation = "classpath:seed/practice.json";
        /** Exam records not re-checked against their official sources for longer than this are flagged for review. */
        private int staleAfterDays = 60;
    }
}
