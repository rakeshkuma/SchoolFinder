package com.indiaschoolfinder.service;

import com.indiaschoolfinder.dto.admission.AdmissionDto;
import com.indiaschoolfinder.dto.fee.FeeDto;
import com.indiaschoolfinder.dto.school.SchoolDetailDto;
import com.indiaschoolfinder.enums.AdmissionStatus;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.text.NumberFormat;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

/**
 * The short questions parents ask about a school, answered only from facts already on its profile (board, classes,
 * management, hostel, published fees, recorded admission cycles, address and official contacts). A question whose facts
 * are not recorded is left out rather than answered vaguely. The same list is shown on the profile page and sent to
 * search engines as FAQPage structured data, so the two always match.
 */
@Service
public class SchoolFaqService {

    public record Faq(String question, String answer) {
    }

    private static final DateTimeFormatter DAY = DateTimeFormatter.ofPattern("d MMMM yyyy", Locale.ENGLISH);

    private final FeeService feeService;
    private final AdmissionService admissionService;

    public SchoolFaqService(FeeService feeService, AdmissionService admissionService) {
        this.feeService = feeService;
        this.admissionService = admissionService;
    }

    public List<Faq> faqs(SchoolDetailDto s) {
        return faqs(s, feeService.feeHistory(s.id()), admissionService.bySchool(s.id()));
    }

    static List<Faq> faqs(SchoolDetailDto s, List<FeeDto> fees, List<AdmissionDto> admissions) {
        List<Faq> out = new ArrayList<>();
        String name = s.name();

        if (s.board() != null) {
            String board = "CISCE".equals(s.board().code()) ? s.board().name() + " (ICSE/ISC)" : s.board().name() + " (" + s.board().code() + ")";
            out.add(new Faq("Which board is " + name + " affiliated to?", name + " is affiliated to " + board
                    + (blank(s.affiliationNumber()) ? "." : ", affiliation number " + s.affiliationNumber().trim() + ".")));
        }

        String classes = classes(s);
        if (classes != null) {
            out.add(new Faq("Which classes does " + name + " have?", name + " has " + classes + "."));
        }

        String kind = kind(s);
        if (kind != null) {
            out.add(new Faq("Is " + name + " a government or private school?", name + " is " + kind + "."));
        }

        String boarding = boarding(s);
        if (boarding != null) {
            out.add(new Faq("Does " + name + " have a hostel?", boarding));
        }

        fees.stream()
                .filter(f -> f.recurringAnnualOfficial() != null && f.recurringAnnualOfficial().signum() >= 0)
                .max(Comparator.comparing(FeeDto::academicYear))
                .ifPresent(f -> {
                    String latestYear = f.academicYear();
                    List<FeeDto> sameYear = fees.stream().filter(x -> latestYear.equals(x.academicYear()) && x.recurringAnnualOfficial() != null).toList();
                    BigDecimal low = sameYear.stream().map(FeeDto::recurringAnnualOfficial).min(Comparator.naturalOrder()).orElseThrow();
                    BigDecimal high = sameYear.stream().map(FeeDto::recurringAnnualOfficial).max(Comparator.naturalOrder()).orElseThrow();
                    String amount = low.compareTo(high) == 0 ? rupees(low) : rupees(low) + " to " + rupees(high) + " depending on the class";
                    out.add(new Faq("What is the fee at " + name + "?", "For " + latestYear + ", the school's published annual fee "
                            + "(tuition and regular charges) is " + amount + ". Transport, books and one-time admission charges are "
                            + "extra. Fees are from the school's official fee schedule; check the latest with the school."));
                });

        admissions.stream()
                .sorted(Comparator.comparing((AdmissionDto a) -> a.status() == AdmissionStatus.OPEN ? 0 : a.status() == AdmissionStatus.UPCOMING ? 1 : 2)
                        .thenComparing(AdmissionDto::academicYear, Comparator.reverseOrder()))
                .findFirst()
                .ifPresent(a -> out.add(new Faq("When are admissions at " + name + "?", admission(a))));

        String address = address(s);
        if (address != null) {
            out.add(new Faq("Where is " + name + "?", name + " is at " + address + "."));
        }

        List<String> contact = new ArrayList<>();
        if (!blank(s.websiteUrl())) {
            contact.add("its official website, " + s.websiteUrl().trim());
        }
        if (!blank(s.phone())) {
            contact.add("phone " + s.phone().split(",")[0].trim());
        }
        if (!contact.isEmpty()) {
            out.add(new Faq("How can I contact " + name + "?", "You can reach the school through " + String.join(", or ", contact) + "."));
        }
        return out;
    }

    private static String classes(SchoolDetailDto s) {
        if (!s.classesOffered().isEmpty()) {
            String first = s.classesOffered().get(0).name();
            String last = s.classesOffered().get(s.classesOffered().size() - 1).name();
            return first.equals(last) ? first : first + " to " + last;
        }
        return blank(s.affiliatedUpTo()) ? null : "classes up to " + s.affiliatedUpTo();
    }

    private static String kind(SchoolDetailDto s) {
        String management = s.management() == null ? null : switch (s.management()) {
            case CENTRAL_GOVERNMENT -> "a central government school";
            case STATE_GOVERNMENT -> "a state government school";
            case LOCAL_BODY -> "a school run by a local body";
            case GOVERNMENT_AIDED -> "a private school that receives government aid";
            case PRIVATE_UNAIDED -> "a private (unaided) school";
            case OTHER -> null;
        };
        if (management != null) {
            return management;
        }
        return s.schoolType() == null ? null : switch (s.schoolType()) {
            case GOVERNMENT -> "a government school";
            case PRIVATE -> "a private school";
            case AIDED -> "a government-aided school";
            case INTERNATIONAL -> "an international school";
        };
    }

    private static String boarding(SchoolDetailDto s) {
        if (s.boarding() != null && s.boarding().boardingType() != null) {
            String type = switch (s.boarding().boardingType()) {
                case FULL_BOARDING -> "a residential (full boarding) school";
                case WEEKLY_BOARDING -> "a weekly boarding school";
                case DAY_CUM_BOARDING -> "a day-cum-boarding school";
            };
            String entry = blank(s.boarding().entryClasses()) ? "" : " Entry: " + s.boarding().entryClasses().trim() + ".";
            return "Yes. " + s.name() + " is " + type + "." + entry;
        }
        if (Boolean.TRUE.equals(s.hasHostel())) {
            return "Yes, " + s.name() + " has a hostel.";
        }
        if (Boolean.FALSE.equals(s.hasHostel())) {
            return "No, " + s.name() + " does not have a hostel.";
        }
        return null;
    }

    private static String admission(AdmissionDto a) {
        StringBuilder text = new StringBuilder(a.className() + " admission for " + a.academicYear() + ": ");
        LocalDate start = a.applicationStartDate();
        LocalDate end = a.applicationEndDate();
        if (start != null && end != null) {
            text.append("applications from ").append(start.format(DAY)).append(" to ").append(end.format(DAY));
        } else if (end != null) {
            text.append("last date to apply ").append(end.format(DAY));
        } else if (start != null) {
            text.append("applications open from ").append(start.format(DAY));
        } else {
            text.append("dates not yet announced");
        }
        text.append(switch (a.status()) {
            case OPEN -> " (open now).";
            case UPCOMING -> " (opening soon).";
            case CLOSED -> " (closed).";
            case NOT_ANNOUNCED -> ".";
        });
        text.append(" Dates are from the official notice; always confirm on it before applying.");
        return text.toString();
    }

    private static String address(SchoolDetailDto s) {
        Set<String> parts = new LinkedHashSet<>();
        for (String part : new String[]{s.addressLine(), s.locality(), s.city(), s.district() == null ? null : s.district().name() + " district", s.stateName()}) {
            if (!blank(part)) {
                parts.add(part.trim());
            }
        }
        if (parts.isEmpty()) {
            return null;
        }
        return String.join(", ", parts) + (blank(s.pinCode()) ? "" : " " + s.pinCode().trim());
    }

    private static String rupees(BigDecimal amount) {
        NumberFormat format = NumberFormat.getIntegerInstance(Locale.forLanguageTag("en-IN"));
        return amount.signum() == 0 ? "free (no fee)" : "₹" + format.format(amount.setScale(0, java.math.RoundingMode.HALF_UP));
    }

    private static boolean blank(String value) {
        return value == null || value.isBlank();
    }
}
