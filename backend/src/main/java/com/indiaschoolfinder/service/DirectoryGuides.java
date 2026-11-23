package com.indiaschoolfinder.service;

import com.indiaschoolfinder.dto.ranking.PremierDirectoryDtos.Guide;
import com.indiaschoolfinder.dto.ranking.PremierDirectoryDtos.GuideFaq;
import com.indiaschoolfinder.dto.ranking.PremierDirectoryDtos.GuideSection;
import com.indiaschoolfinder.dto.ranking.PremierDirectoryDtos.GuideSource;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Explainers for the directory views whose curriculum most parents do not know: IB and Cambridge schools. Search Console
 * (9-21 Nov 2026) showed these two pages reached for "top ib schools in india", "ib schools in india", "cambridge schools
 * in india" and similar queries at positions 50 to 80, while the pages had only a one-line description above the list.
 *
 * <p>Every fact below was checked on {@code CHECKED} against the official pages listed with it (the IB's and Cambridge
 * International's own sites). Nothing here ranks a school or states a fee. Change the text here only: the app, the server's
 * HTML and the FAQPage data all read it.
 */
public final class DirectoryGuides {

    private DirectoryGuides() {
    }

    static final LocalDate CHECKED = LocalDate.of(2026, 11, 23);

    private static final GuideFaq NOT_A_RANKING = new GuideFaq("Is this list a ranking?",
            "No. The schools are listed A to Z from SchoolDhundo's premier school directory. Where an independent publisher has "
                    + "ranked a school, the card shows that rank with its publisher and year.");

    private static final Guide IB = new Guide(
            "About IB schools in India",
            "What to know before shortlisting an IB school, checked against the International Baccalaureate's own pages.",
            List.of(
                    new GuideSection("What the IB is", List.of(
                            "The International Baccalaureate (IB) is a non-profit education foundation. Only schools it has "
                                    + "authorised, called IB World Schools, may teach its programmes, and a school can be "
                                    + "authorised for one programme or several.",
                            "Some schools in this list also teach a national board, such as ICSE or CBSE, in other classes. "
                                    + "Each card shows the boards on the school's record."), List.of()),
                    new GuideSection("The four IB programmes", List.of(), List.of(
                            "Primary Years Programme (PYP): ages 3 to 12.",
                            "Middle Years Programme (MYP): ages 11 to 16.",
                            "Diploma Programme (DP): ages 16 to 19, a two-year course usually taken in Classes 11 and 12. "
                                    + "Students take six subjects and the core (Theory of Knowledge, the Extended Essay, and "
                                    + "Creativity, Activity, Service), and the Diploma is scored out of 45 points.",
                            "Career-related Programme (CP): ages 16 to 19, combining Diploma Programme courses with "
                                    + "career-related study.")),
                    new GuideSection("University admission in India", List.of(
                            "According to the IB, the Association of Indian Universities (AIU) has recognised the IB Diploma as "
                                    + "an entry qualification to universities in India since 1983. Some universities and courses, "
                                    + "such as medicine at some institutions, also ask for an AIU equivalence certificate, and "
                                    + "entrance exams set their own subject rules, so check each one before choosing Diploma "
                                    + "subjects."), List.of()),
                    new GuideSection("Checking a school and its fees", List.of(
                            "Confirm the programmes a school is authorised to teach in the IB's own directory, Find an IB World "
                                    + "School. The fee on each card is an approximate yearly range: ask the school for the "
                                    + "current fee and what it includes."), List.of())),
            List.of(
                    new GuideFaq("What ages do IB programmes cover?",
                            "The Primary Years Programme is for ages 3 to 12, the Middle Years Programme for 11 to 16, and the "
                                    + "Diploma and Career-related Programmes for 16 to 19."),
                    new GuideFaq("Is the IB Diploma accepted by Indian universities?",
                            "Yes. The IB says the Association of Indian Universities has recognised the Diploma as an entry "
                                    + "qualification to universities in India since 1983. Some universities and courses also ask "
                                    + "for an AIU equivalence certificate."),
                    new GuideFaq("How can I check that a school is an IB World School?",
                            "Search for it in the IB's Find an IB World School directory on ibo.org, which lists the "
                                    + "programmes each school is authorised to teach."),
                    NOT_A_RANKING),
            List.of(
                    new GuideSource("International Baccalaureate: Find an IB World School",
                            "https://www.ibo.org/programmes/find-an-ib-school/"),
                    new GuideSource("International Baccalaureate: AIU recognition in India (news release)",
                            "https://www.ibo.org/news/news-about-ib-schools/association-of-indian-universities-recognizes-career-related-programme/"),
                    new GuideSource("International Baccalaureate: recognition guide for India (PDF)",
                            "https://www.ibo.org/globalassets/new-structure/recognition/pdfs/india-recognition-guide-en.pdf")),
            CHECKED);

    private static final Guide CAMBRIDGE = new Guide(
            "About Cambridge schools in India",
            "What to know before shortlisting a Cambridge school, checked against Cambridge International's own pages.",
            List.of(
                    new GuideSection("What Cambridge International is", List.of(
                            "Cambridge International Education is part of Cambridge University Press & Assessment, a "
                                    + "department of the University of Cambridge. Schools must be registered with it to teach "
                                    + "its programmes and enter students for its exams.",
                            "Some schools in this list also teach a national board, such as ICSE or CBSE, in other classes. "
                                    + "Each card shows the boards on the school's record."), List.of()),
                    new GuideSection("The Cambridge stages", List.of(
                            "A school can offer some of these stages without the others."), List.of(
                            "Cambridge Primary: typically ages 5 to 11.",
                            "Cambridge Lower Secondary: typically ages 11 to 14.",
                            "Cambridge Upper Secondary: typically ages 14 to 16, leading to Cambridge IGCSE or O Level.",
                            "Cambridge Advanced: typically ages 16 to 19, leading to Cambridge International AS & A Level.")),
                    new GuideSection("Exams and university admission in India", List.of(
                            "Besides the June and November exam series, Cambridge holds a March series for schools in India "
                                    + "and Romania, for selected Cambridge IGCSE and AS & A Level syllabuses.",
                            "Cambridge says the Association of Indian Universities (AIU) treats passes in five Cambridge IGCSE "
                                    + "or O Level subjects, including English, as equivalent to Class 10, and Cambridge "
                                    + "International A Levels as equivalent to Class 12. Universities set their own subject and "
                                    + "grade requirements, and some courses ask for an AIU equivalence certificate."), List.of()),
                    new GuideSection("Checking a school and its fees", List.of(
                            "Confirm a school's registration in Cambridge's own directory, Find a Cambridge school. The fee on "
                                    + "each card is an approximate yearly range: ask the school for the current fee and what it "
                                    + "includes."), List.of())),
            List.of(
                    new GuideFaq("Is IGCSE equivalent to Class 10 in India?",
                            "Cambridge says the Association of Indian Universities treats passes in five Cambridge IGCSE or O "
                                    + "Level subjects, including English, as equivalent to Class 10."),
                    new GuideFaq("Do Indian universities accept Cambridge A Levels?",
                            "Yes, through the AIU's equivalence with Class 12. Requirements differ between universities and "
                                    + "courses, and some ask for an AIU equivalence certificate."),
                    new GuideFaq("When are Cambridge exams held in India?",
                            "In the June and November series, and in a March series that Cambridge offers to schools in India "
                                    + "and Romania for selected syllabuses."),
                    NOT_A_RANKING),
            List.of(
                    new GuideSource("Cambridge International: Find a Cambridge school",
                            "https://www.cambridgeinternational.org/why-choose-us/find-a-cambridge-school/"),
                    new GuideSource("Cambridge International: recognition in India",
                            "https://www.cambridgeinternational.org/programmes-and-qualifications/recognition-and-acceptance/country/india/"),
                    new GuideSource("Cambridge International: March exam series",
                            "https://www.cambridgeinternational.org/exam-administration/march-series/"),
                    new GuideSource("Cambridge International: programmes and qualifications",
                            "https://www.cambridgeinternational.org/programmes-and-qualifications/")),
            CHECKED);

    private static final Map<String, Guide> GUIDES = Map.of("ib-schools", IB, "cambridge-schools", CAMBRIDGE);

    /** The explainer for a directory view, if it has one. */
    public static Optional<Guide> forView(String slug) {
        return Optional.ofNullable(GUIDES.get(slug));
    }
}
