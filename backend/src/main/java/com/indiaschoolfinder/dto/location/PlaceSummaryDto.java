package com.indiaschoolfinder.dto.location;

import java.util.List;

/**
 * What the schools listed for one state, district or town add up to: counts by board, management and network, a few
 * named examples, and an introduction and answers written from those numbers only. Shown on the place's page by the app
 * and in the server-rendered HTML, so both say the same thing.
 *
 * @param place     the place as a heading names it ("Dholpur", "Agra district", "Bihar")
 * @param placeFull with its state where that helps ("Dholpur, Rajasthan")
 */
public record PlaceSummaryDto(String place, String placeFull, long total, String intro, List<Count> boards, List<Count> types,
                              List<Count> networks, List<Count> genders, long boarding, long seniorSecondary,
                              long withAdmissionDates, List<SchoolLink> oldest, List<Faq> faqs, List<Link> related) {

    /** A page on this site that fits the place (the JNVST guide where a Navodaya is listed, and so on). */
    public record Link(String href, String label) {
    }

    /** @param code the stored value (CBSE, GOVERNMENT, JAWAHAR_NAVODAYA_VIDYALAYA, GIRLS ...) */
    public record Count(String code, String label, long count) {
    }

    public record SchoolLink(String name, String slug, Integer established) {
    }

    public record Faq(String question, String answer) {
    }
}
