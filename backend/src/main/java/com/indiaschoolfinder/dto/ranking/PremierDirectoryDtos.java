package com.indiaschoolfinder.dto.ranking;

import java.time.LocalDate;
import java.util.List;

/**
 * SchoolDhundo's directory of premier and boarding schools. It is a curated directory, not a ranking: no field here is a
 * rank of SchoolDhundo's. A {@link Rank} is a publisher's own published rank, shown with its source.
 */
public final class PremierDirectoryDtos {

    private PremierDirectoryDtos() {
    }

    /** A board the school is listed under; confirmed when its official website or CBSE / CISCE record says so. */
    public record Board(String code, boolean confirmed) {
    }

    /** A verified, published rank from an independent publisher, exactly as printed. */
    public record Rank(String publisher, String publisherName, String year, String list, Integer rank, String sourceUrl) {
    }

    public record School(long id, String key, String name, String city, String stateCode, String stateName, String section,
                         List<Board> boards, String curriculumNote, String gender, boolean genderConfirmed, String residence,
                         boolean residenceConfirmed, String classesLabel, boolean classesConfirmed, Integer feeMinInr, Integer feeMaxInr,
                         String feeText, String websiteUrl, boolean websiteChecked, Long schoolId, String slug, String campusSearch,
                         String imageUrl, String imageCredit, boolean featured, boolean sponsored, String note, LocalDate checkedOn,
                         Rank rank) {
    }

    /** A view of the directory, with how many schools it holds; views without schools are never returned. */
    public record Category(String slug, String title, String description, long schools) {
    }

    public record Facet(String code, String name, String stateCode, long schools) {
    }

    /**
     * SchoolDhundo's own explainer for a view such as IB or Cambridge schools: what the curriculum is, how to check a
     * school, and the questions parents ask, each fact from the official source listed with it. The app, the server's
     * HTML and the FAQPage data all use this one text (see DirectoryGuides).
     */
    public record Guide(String heading, String intro, List<GuideSection> sections, List<GuideFaq> faqs, List<GuideSource> sources,
                        LocalDate checkedOn) {
    }

    /** A section: its paragraphs, then an optional list of points. */
    public record GuideSection(String heading, List<String> paragraphs, List<String> points) {
    }

    public record GuideFaq(String question, String answer) {
    }

    public record GuideSource(String title, String url) {
    }

    /** Only values that some school in the view has, so a filter never offers an empty choice. */
    public record Facets(List<Facet> states, List<Facet> cities, List<Facet> boards, List<Facet> residences, List<Facet> genders,
                         List<Facet> sections, List<Integer> classes) {
    }

    public record Summary(long schools, long states, long cities, long boarding, long boards, LocalDate checkedOn,
                          List<Category> categories) {
    }

    /** Filters; every value is optional. {@code cls} 0 is pre-primary, 1 to 12 are classes. */
    public record Query(String category, String q, String state, String city, String board, String residence, String gender,
                        String section, Integer cls, String sort) {

        public Query withCategory(String c) {
            return new Query(c, q, state, city, board, residence, gender, section, cls, sort);
        }
    }

    /** One school on its directory page, with every view it appears in. */
    public record SchoolEntry(School school, List<Category> categories) {
    }

    public record Seed(int version, LocalDate checkedOn, List<SeedEntry> entries) {
    }

    public record SeedEntry(String key, int order, String section, String name, String city, String stateCode, String schoolSlug,
                            String campusSearch, List<Board> boards, String curriculumNote, String gender, boolean genderConfirmed,
                            String residence, boolean residenceConfirmed, String classesLabel, Integer lowestClass, Integer highestClass,
                            boolean classesConfirmed, Integer feeMinInr, Integer feeMaxInr, String feeText, String websiteUrl,
                            boolean websiteChecked, String note, LocalDate checkedOn) {
    }
}
