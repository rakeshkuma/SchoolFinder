package com.indiaschoolfinder.notifications.opportunity;

import com.indiaschoolfinder.entity.SiteUpdate;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Reads what an admission or job notice's own words say: whether it is an opening or a later step (a result, admit
 * cards, a corrigendum...), which posts and subjects it names, teaching or not, regular or contract, the session and
 * classes of an admission, and the last date, opening date, exam or walk-in date where the words state one. It works
 * on the title (or listing text) exactly as the official source printed it, in English or Hindi, with Indian digits.
 *
 * <p>Nothing is inferred beyond the words: a notice that names no last date gets none; a post not named is not listed.
 * It is plain keyword rules, so it can be wrong about wording it has not seen; what it cannot place is left empty and
 * the daily check sends unclear notices to an editor rather than publishing them.
 */
public final class OpportunityClassifier {

    private OpportunityClassifier() {
    }

    /** One post a recruitment notice's title names, e.g. "PGT (Physics)". */
    public record Position(String postName, String postType, String subject) {
    }

    /**
     * @param schoolPost    the words name a teaching or school-leadership post, or a school ("DoE", "Vidyalaya")
     * @param schoolStaff   the words name a post schools also have (librarian, lab assistant, counsellor, warden), which
     *                      alone does not show that the post is in a school (a commission also recruits them for
     *                      libraries and laboratories)
     * @param nonSchoolPost the words name a post that is not school employment (an engineer, a project associate...)
     * @param generic       a job notice that names no post at all ("Advertisement No. 3/2026 for various posts")
     */
    public record Facts(SiteUpdate.NoticeType noticeType, List<String> postTypes, List<String> subjects,
                        SiteUpdate.StaffKind staffKind, SiteUpdate.EmploymentType employmentType, boolean schoolPost,
                        boolean schoolStaff, boolean nonSchoolPost, boolean generic, boolean walkIn, String academicSession,
                        String classes, LocalDate opensOn, LocalDate closesOn, LocalDate examOn, Integer vacancies,
                        List<Position> positions) {

        /** The same facts as another kind of notice (an entry of a careers page is an opening). */
        public Facts withNoticeType(SiteUpdate.NoticeType type) {
            return new Facts(type, postTypes, subjects, staffKind, employmentType, schoolPost, schoolStaff, nonSchoolPost, generic,
                    walkIn, academicSession, classes, opensOn, closesOn, examOn, vacancies, positions);
        }

        /** The same facts with other dates (read from the notice's official document rather than its title). */
        public Facts withDates(LocalDate opens, LocalDate closes, LocalDate exam, boolean isWalkIn) {
            return new Facts(noticeType == SiteUpdate.NoticeType.OTHER && isWalkIn ? SiteUpdate.NoticeType.OPENING : noticeType,
                    postTypes, subjects, staffKind, isWalkIn ? SiteUpdate.EmploymentType.CONTRACT : employmentType, schoolPost,
                    schoolStaff, nonSchoolPost, generic, isWalkIn, academicSession, classes, opens, closes, exam, vacancies, positions);
        }

        /** The post names to show: those read as positions, else the posts named (never staff categories). */
        public List<String> postNames() {
            if (!positions.isEmpty()) {
                return positions.stream().map(Position::postName).toList();
            }
            return postTypes.stream().filter(OpportunityClassifier::namesAPost).map(c -> Set.of("PGT", "TGT", "PRT", "NTT").contains(c)
                    ? c : postLabel(c)).toList();
        }
    }

    /** What an entry on an official site is about, if it is an admission or a job notice at all. */
    public record Relevance(SiteUpdate.Category category, boolean certain, String reason) {
    }

    // --- posts ----------------------------------------------------------------------------------------------------

    private record Post(String code, String label, boolean teaching, Pattern pattern) {
    }

    private static Pattern p(String regex) {
        return Pattern.compile(regex, Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE);
    }

    /** Most specific first: each match is blanked out before the next pattern is tried ("vice principal" is not also "principal"). */
    private static final List<Post> POSTS = List.of(
            new Post("VICE_PRINCIPAL", "Vice Principal", true, p("vice[\\s-]*principals?|उप[\\s-]*प्रधानाचार्य|उप[\\s-]*प्राचार्य")),
            new Post("PRINCIPAL", "Principal", true,
                    p("\\bprincipals?\\b(?!\\s*(secretary|accountant|investigator|scientist|director|controller|consultant|private))|प्रधानाचार्य|प्राचार्य")),
            new Post("HEADMASTER", "Headmaster / Headmistress", true,
                    p("head[\\s-]*(master|mistress|teacher)s?|प्रधानाध्यापक|प्रधान\\s*(शिक्षक|अध्यापक)")),
            new Post("COORDINATOR", "Academic Coordinator", true,
                    p("(academic|activity|activities|exam(ination)?s?|pre-?primary|primary|middle|senior|junior|wing|cca|co-?curricular|curriculum|ib|igcse|cambridge|pyp|myp|dp)\\s+co-?ordinators?")),
            new Post("NTT", "Nursery / Pre-primary Teacher", true,
                    p("\\bntts?\\b|nursery\\s*(trained\\s*)?teachers?|pre[\\s-]*primary\\s*teachers?|kindergarten\\s*teachers?|\\bk\\.?g\\.?\\s*teachers?|early\\s*years\\s*(teachers?|educators?|facilitators?)|balvatika")),
            new Post("PGT", "PGT (Post Graduate Teacher)", true,
                    p("\\bpgts?\\b|post[\\s-]*graduate\\s*teachers?|\\blecturers?\\b|प्रवक्ता|स्नातकोत्तर\\s*शिक्षक|पीजीटी")),
            new Post("TGT", "TGT (Trained Graduate Teacher)", true,
                    p("\\btgts?\\b|trained\\s*graduate\\s*teachers?|\\bl\\.?\\s?t\\.?\\s*grade|स्नातक\\s*शिक्षक|टीजीटी|एल\\.?\\s*टी\\.?\\s*ग्रेड")),
            new Post("PRT", "PRT (Primary Teacher)", true,
                    p("\\bprts?\\b|primary\\s*teachers?|assistant\\s*teachers?\\s*\\(?\\s*primary|प्राथमिक\\s*शिक्षक|प्रारंभिक\\s*शिक्षक|पीआरटी")),
            // The teacher posts of Rashtriya Military Schools and Sainik Schools.
            new Post("ASSISTANT_MASTER", "Assistant Master / Mistress", true,
                    p("\\b(assistant|asst\\.?)\\s*(masters?|mistress(es)?)\\b")),
            new Post("SPECIAL_EDUCATOR", "Special Educator", true,
                    p("special\\s*educat(ors?|ion\\s*teachers?)|special\\s*teachers?|विशेष\\s*(शिक्षक|शिक्षा\\s*शिक्षक)")),
            new Post("PET", "Physical Education Teacher", true,
                    p("\\bpets?\\b|\\bp\\.e\\.t\\.?|physical\\s*education\\s*(teachers?|instructors?)|\\bpti\\b|sports\\s*(coach(es)?|teachers?|instructors?)|games\\s*(teachers?|instructors?)|yoga\\s*(teachers?|instructors?)|शारीरिक\\s*शिक्षक")),
            new Post("LIBRARIAN", "Librarian", false, p("librarians?|library\\s*(assistants?|attendants?|staff)|पुस्तकालयाध्यक्ष")),
            new Post("COUNSELLOR", "Counsellor", false, p("counsell?ors?\\b|psychologists?\\b|परामर्शदाता")),
            new Post("LAB_ASSISTANT", "Lab Assistant", false,
                    p("lab(oratory)?\\s*(assistants?|attendants?|technicians?|staff|in-?charge)|प्रयोगशाला\\s*(सहायक|परिचारक)")),
            new Post("WARDEN", "Hostel Warden / Housemaster", false,
                    p("wardens?\\b|house\\s*-?\\s*(masters?|mistress(es)?|parents?|tutors?)|matrons?\\b|hostel\\s*(superintendents?|in-?charge|staff)|boarding\\s*(supervisors?|in-?charge|staff)|dorm(itory)?\\s*(parents?|in-?charge)|छात्रावास|वार्डन")),
            new Post("IT_SUPPORT", "School IT Support", false,
                    p("system\\s*admin(istrator)?s?|\\bit\\s*(support|staff|assistants?|executives?|managers?|technicians?|administrators?|head)|network\\s*(admin(istrator)?|engineer)s?|computer\\s*operators?|data\\s*entry|programmers?|web\\s*developers?|erp\\s*(executives?|operators?)")),
            new Post("ADMIN_STAFF", "Administrative / Office Staff", false,
                    p("office\\s*(assistants?|superintendents?|staff|managers?|executives?|secretar(y|ies))|administrative\\s*(officers?|staff|assistants?|managers?)|\\badmin(istration)?\\s*(officers?|staff|executives?|managers?|assistants?)|clerks?\\b|\\bldcs?\\b|\\budcs?\\b|accountants?\\b|accounts?\\s*(officers?|assistants?|clerks?|executives?|managers?)|bursars?|registrars?\\b|receptionists?|front\\s*office|junior\\s*secretariat|\\bjsa\\b|multi[\\s-]*tasking|\\bmts\\b|peons?\\b|sub[\\s-]*staff|office\\s*boys?|store\\s*(keepers?|in-?charge)|estate\\s*(managers?|officers?)|hr\\s*(executives?|managers?|officers?)|लिपिक|कार्यालय\\s*सहायक|लेखाकार")),
            new Post("SUPPORT_STAFF", "Support Staff", false,
                    p("nurses?\\b|nursing|medical\\s*officers?|doctors?\\b|cooks?\\b|chefs?\\b|kitchen|mess\\s*(managers?|staff|supervisors?)|drivers?\\b|security\\s*(guards?|officers?|staff|supervisors?)|guards?\\b|chowkidars?|electricians?|plumbers?|carpent(ers?|ry)|masons?\\b|gardeners?|\\bmali\\b|sweepers?|safai|housekeeping|ward\\s*(boys?|girls?)|aayas?\\b|ayahs?\\b|helpers?\\b|attendants?\\b|technicians?\\b|engineering\\s*associates?|maintenance|caretakers?|workshop")));

    /** Codes that are kinds of staff rather than post names ("Support Staff" is a filter, not a job title). */
    private static final Set<String> CATEGORY_CODES = Set.of("ADMIN_STAFF", "SUPPORT_STAFF", "IT_SUPPORT", "TEACHER");

    /** Whether a post type code names an actual post (PGT, Principal, Librarian...) that can be shown as one. */
    public static boolean namesAPost(String code) {
        return code != null && LABELS.containsKey(code) && !CATEGORY_CODES.contains(code);
    }

    private static final Set<String> TEACHING_CODES = Set.of("VICE_PRINCIPAL", "PRINCIPAL", "HEADMASTER", "COORDINATOR", "NTT", "PGT", "TGT", "PRT",
            "ASSISTANT_MASTER", "SPECIAL_EDUCATOR", "PET", "TEACHER");
    private static final Pattern GENERIC_TEACHER = p("teachers?\\b|teaching\\s*(staff|faculty|posts?|positions?)|\\bfaculty\\b|\\beducators?\\b|शिक्षक|शिक्षिका|अध्यापक");
    private static final Pattern NON_TEACHING = p("non[\\s-]*teaching|गैर[\\s-]*शैक्षणिक|शिक्षणेतर");
    private static final Pattern TEACHING_WORD = p("\\bteaching\\b|शैक्षणिक");
    private static final Map<String, String> LABELS = new LinkedHashMap<>();

    static {
        POSTS.forEach(post -> LABELS.put(post.code(), post.label()));
        LABELS.put("TEACHER", "Teacher (other)");
    }

    /** Post type codes and their labels, in the order lists show them. */
    public static Map<String, String> postLabels() {
        return java.util.Collections.unmodifiableMap(LABELS);
    }

    public static String postLabel(String code) {
        return LABELS.getOrDefault(code, code);
    }

    /** Posts that are not school employment, when a school system's or a commission's notice names them. */
    private static final Pattern NON_SCHOOL = p("\\bengineers?\\b|\\bje\\b|\\bae\\b|project\\s*(associates?|assistants?|scientists?|fellows?|managers?|staff|consultants?|officers?)"
            + "|consultants?\\b|legal\\s*(assistants?|officers?|advis[eo]rs?|consultants?)|law\\s*officers?|advocates?|chartered\\s*accountants?|internal\\s*auditors?"
            + "|\\bauditors?\\b|finance\\s*(officers?|controllers?)|section\\s*officers?|assistant\\s*section|\\baso\\b|translators?|private\\s*secretar(y|ies)"
            + "|personal\\s*assistants?|stenograph|\\bsteno\\b|architects?|draughts?m[ae]n|malaria|inspectors?\\b|police|forest|patwari|revenue|excise|sugarcane"
            + "|prosecution|research\\s*officers?|veterinar|agricultur|horticultur|pharmacists?|dental|staff\\s*nurses?|judicial|civil\\s*judge|danics|\\bdass\\b"
            + "|gnctdss|young\\s*professionals?|\\binterns?(hip)?\\b");
    private static final Pattern SCHOOL_WORDS = p("school|vidyalaya|विद्यालय|\\bdoe\\b|directorate\\s*of\\s*education|education\\s*department|शिक्षा\\s*विभाग|\\btre\\b|शिक्षक|अध्यापक");
    private static final Pattern GENERIC_JOB = p("various\\s*posts?|vacancy\\s*notice|advertisement|\\badvt\\.?\\b|recruitment|notification\\s*no|विज्ञापन|भर्ती|रिक्ति");
    private static final Pattern NAMED_POST = p("\\bposts?\\s+(of|for)\\s+(the\\s+)?(?!various)[a-z]");

    // --- subjects -------------------------------------------------------------------------------------------------

    /** Compound names first, so "computer science" is not also "science". */
    private static final List<Map.Entry<String, Pattern>> SUBJECTS = List.of(
            Map.entry("Computer Science", p("computer\\s*(science|applications?)|informatics\\s*practices|information\\s*technology|\\bcomputers?\\b|\\bict\\b|कंप्यूटर|कम्प्यूटर")),
            Map.entry("Social Science", p("social\\s*(science|studies|sciences)|\\bsst\\b|सामाजिक\\s*(विज्ञान|अध्ययन)")),
            Map.entry("Political Science", p("political\\s*science|pol\\.?\\s*sc|civics|राजनीति")),
            Map.entry("Home Science", p("home\\s*science|गृह\\s*विज्ञान")),
            Map.entry("Mathematics", p("\\bmath(s|ematics)?\\b|गणित")),
            Map.entry("Physics", p("\\bphysics\\b|\\bphy\\b|भौतिक")),
            Map.entry("Chemistry", p("chemistry|\\bchem\\b|रसायन")),
            Map.entry("Biology", p("biology|\\bbio\\b|zoology|botany|life\\s*science|जीव\\s*विज्ञान|जीवविज्ञान")),
            Map.entry("Biotechnology", p("biotech")),
            Map.entry("Science", p("\\bscience\\b|विज्ञान")),
            Map.entry("English", p("english|अंग्रेज़ी|अंग्रेजी")),
            Map.entry("Hindi", p("\\bhindi\\b|हिंदी|हिन्दी")),
            Map.entry("Sanskrit", p("sanskrit|संस्कृत")),
            Map.entry("Urdu", p("\\burdu\\b|उर्दू")),
            Map.entry("Punjabi", p("punjabi|पंजाबी")),
            Map.entry("Bengali", p("bengali|bangla|बांग्ला")),
            Map.entry("Odia", p("\\bodia\\b|\\boriya\\b")),
            Map.entry("Assamese", p("assamese")),
            Map.entry("Telugu", p("telugu")),
            Map.entry("Tamil", p("\\btamil\\b")),
            Map.entry("Kannada", p("kannada")),
            Map.entry("Malayalam", p("malayalam")),
            Map.entry("Marathi", p("marathi|मराठी")),
            Map.entry("Gujarati", p("gujarati")),
            Map.entry("Nepali", p("nepali")),
            Map.entry("French", p("french")),
            Map.entry("German", p("german")),
            Map.entry("Spanish", p("spanish")),
            Map.entry("Japanese", p("japanese")),
            Map.entry("Chinese", p("chinese|mandarin")),
            Map.entry("Regional Language", p("regional\\s*language|third\\s*language|\\bmil\\b")),
            Map.entry("History", p("history|इतिहास")),
            Map.entry("Geography", p("geography|भूगोल")),
            Map.entry("Economics", p("economics|अर्थशास्त्र")),
            Map.entry("Commerce", p("commerce|accountancy|business\\s*studies|वाणिज्य")),
            Map.entry("Psychology", p("psychology|मनोविज्ञान")),
            Map.entry("Sociology", p("sociology|समाजशास्त्र")),
            Map.entry("Philosophy", p("philosophy")),
            Map.entry("Music", p("\\bmusic|संगीत|\\btabla\\b|\\bvocal\\b|instrumental")),
            // Java's \b only knows ASCII word characters, so Devanagari words are matched without it.
            Map.entry("Art", p("\\bart\\b|\\barts?\\s*(&|and)\\s*crafts?|drawing|painting|fine\\s*arts?|visual\\s*arts?|कला(?!\\S*कार)")),
            Map.entry("Dance", p("\\bdance\\b|नृत्य")),
            Map.entry("Theatre", p("theatre|theater|drama")),
            Map.entry("Physical Education", p("physical\\s*education|\\bpets?\\b|\\bpti\\b|\\bsports\\b|\\byoga\\b|शारीरिक")));

    // --- kinds of notice and relevance ----------------------------------------------------------------------------

    private static final Pattern RULES = p("recruitment\\s*rules|service\\s*rules|भर्ती\\s*नियम");
    private static final Pattern ADMIT_CARD = p("admit\\s*cards?|call\\s*letters?|interview\\s*letters?|hall\\s*tickets?|e-?admit|प्रवेश[\\s-]*पत्र");
    private static final Pattern RESULT = p("\\bresults?\\b|\\bselected\\b|selection\\s*list|select\\s*list|merit\\s*list|final\\s*list|short-?\\s*listed|shortlist"
            + "|list\\s*of\\s*(the\\s*)?(candidates|eligible|qualified|successful|provisional|selected|shortlisted|students|applicants)|qualified\\s*candidates"
            + "|\\bmarks\\b|answer\\s*keys?|cut[\\s-]*off|appeared\\s*candidates|registered\\s*candidates|provisional\\s*(list|allotment|admission\\s*list)"
            + "|waiting\\s*list|wait\\s*list|allotment|lottery|draw\\s*of\\s*lots|promotion\\s*list|परिणाम|चयन\\s*सूची|प्रतीक्षा\\s*सूची|मेधा\\s*सूची|मेरिट\\s*सूची");
    private static final Pattern CORRIGENDUM = p("corrigend|addend|errat|modification|amendment|cancell?ation|cancell?ed|withdraw|शुद्धि[\\s-]*पत्र|संशोधन");
    private static final Pattern EXTENSION = p("extension|extended|\\bextend|re-?open|बढ़ा|बढा|विस्तार|ବୃଦ୍ଧି");
    private static final Pattern WALK_IN = p("walk[\\s-]*in|वॉक[\\s-]*इन");
    private static final Pattern SCHEDULE = p("schedule|date\\s*sheet|(interview|exam(ination)?|test|verification|counsell?ing)\\s*program(me)?"
            + "|time[\\s-]*table|document\\s*verification|\\bdv\\b"
            + "|counsell?ing\\s*(schedule|dates?|programme)|interview\\s*(schedule|dates?|on|dated|will|for\\s*the\\s*post)|notice\\s*(for|of|regarding)\\s*interview"
            + "|exam(ination)?\\s*(schedule|dates?|city)|skill\\s*test|written\\s*test|demo(nstration)?\\s*(class|lesson)|कार्यक्रम|साक्षात्कार");
    private static final Pattern JOB_OPENING = p("recruit|vacanc|advertisement|\\badvt\\b|engagement|employment\\s*notice|applications?\\s*(are\\s*)?invited|\\binvit|hiring|careers?"
            + "|openings?|required|wanted|application\\s*(form|format)|apply|भर्ती|रिक्ति|आवेदन|नियुक्ति|विज्ञापन|आवश्यकता");
    private static final Pattern ADMISSION_OPENING = p("admission|registration|apply|application|forms?\\b|entrance|prospectus|seats?|प्रवेश|नामांकन|पंजीकरण|आवेदन"
            + "|ନାମଲେଖା|ପଞ୍ଜୀକରଣ|ଆବେଦନ");

    private static final Pattern IRRELEVANT = p("tender|\\brfp\\b|request\\s*for\\s*proposal|quotation|e-?bid|\\bbids?\\b|auction|supply\\s*of|procurement|\\blease\\b"
            + "|hiring\\s*of\\s*(vehicles?|shamiyana|tents?|bus(es)?|taxis?|cars?)|rate\\s*contract|empanelment\\s*of\\s*(vendors?|agenc|firms?)|work\\s*order"
            + "|expression\\s*of\\s*interest|\\beoi\\b|home\\s*-?\\s*work|holiday\\s*h|syllabus|annual\\s*report|newsletter|magazine|fee\\s*structure|uniform\\b"
            + "|transfer\\s*certificate|mandatory\\s*disclosure|sports\\s*day|annual\\s*day|celebrat|competition|olympiad|\\bptm\\b|parents?[\\s-]*teachers?\\s*meet"
            + "|result\\s*of\\s*class|class\\s*(x|xii|10|12)\\s*(board\\s*)?results?|board\\s*exam(ination)?\\s*results?|\\bhra\\b|house\\s*rent|pension|\\bgpf\\b"
            + "|salary\\s*bill|\\bapar\\b|seniority\\s*list|transfer\\s*(order|policy)|leave\\s*rules|निविदा|कोटेशन|नीलामी");
    private static final Pattern JOB_STRONG = p("recruit|vacanc|walk[\\s-]*in|\\bpgts?\\b|\\btgts?\\b|\\bprts?\\b|\\bntts?\\b|teachers?\\b|faculty|engagement|contractual"
            + "|appointment\\s*of|posts?\\s+of|post\\s*code|careers?\\b|\\bjobs?\\b|hiring|employment|vice[\\s-]*principal|\\bprincipal\\b|librarian|counsell?or"
            + "|warden|accountant|clerk|assistant\\s*masters?|भर्ती|रिक्ति|नियुक्ति|शिक्षक|अध्यापक|संविदा"
            // Odia (Odisha's own notices): appointment, teacher
            + "|ନିଯୁକ୍ତି|ଶିକ୍ଷକ");
    private static final Pattern JOB_WEAK = p("interview|advertisement|\\badvt\\b|shortlist|selection|selected\\s*candidates|for\\s*the\\s*post|application\\s*form"
            + "|विज्ञापन|साक्षात्कार");
    private static final Pattern ADMISSION_STRONG = p("admission|admissions|प्रवेश|नामांकन|\\baissee\\b|\\bjnvst\\b|\\blest\\b|entrance\\s*(test|exam)"
            + "|registration\\s*for\\s*(class|grade|admission)|balvatika|bal\\s*vatika|\\boavet\\b|\\bomavet\\b|seats?\\s*(for|in)\\s*class|nursery\\s*(admission|registration)"
            // Odia: enrolment (admission), entrance examination
            + "|ନାମଲେଖା|ପ୍ରବେଶିକା");
    private static final Pattern ADMISSION_WEAK = p("registration\\s*form|registration|prospectus|application\\s*form|पंजीकरण");

    /**
     * True when a job notice's words name only posts outside school employment (an engineer or a project associate of a
     * school system), with no teaching post, school post or school named.
     */
    public static boolean nonSchoolOnly(String title) {
        String t = DateText.normaliseDigits(title == null ? "" : title);
        if (!NON_SCHOOL.matcher(t).find()) {
            return false; // the common case, without reading the rest
        }
        Facts f = facts(SiteUpdate.Category.JOB, t, null);
        return f.nonSchoolPost() && !f.schoolPost() && !f.schoolStaff();
    }

    /** Tenders, homework, school exam results, fee and salary circulars and the like: never an admission or a job. */
    public static boolean irrelevant(String text) {
        return text == null || text.isBlank() || IRRELEVANT.matcher(DateText.normaliseDigits(text)).find();
    }

    /**
     * Whether an entry on an official site is an admission or job notice. Tenders, circulars, homework, results of
     * school examinations and the like are not. "Certain" when the words leave no doubt; otherwise the notice is kept
     * for an editor with {@code reason}.
     */
    public static Relevance relevance(String text, Set<SiteUpdate.Category> allowed) {
        String t = DateText.normaliseDigits(text == null ? "" : text);
        if (t.isBlank() || IRRELEVANT.matcher(t).find()) {
            return null;
        }
        boolean job = allowed.contains(SiteUpdate.Category.JOB);
        boolean admission = allowed.contains(SiteUpdate.Category.ADMISSION);
        if (job && JOB_STRONG.matcher(t).find()) {
            return new Relevance(SiteUpdate.Category.JOB, true, null);
        }
        if (admission && ADMISSION_STRONG.matcher(t).find()) {
            return new Relevance(SiteUpdate.Category.ADMISSION, true, null);
        }
        Matcher weak = JOB_WEAK.matcher(t);
        if (job && weak.find()) {
            return new Relevance(SiteUpdate.Category.JOB, false,
                    "Taken for a job notice only from the word \u201c" + weak.group() + "\u201d; check it is a school job notice.");
        }
        weak = ADMISSION_WEAK.matcher(t);
        if (admission && weak.find()) {
            return new Relevance(SiteUpdate.Category.ADMISSION, false,
                    "Taken for an admission notice only from the word \u201c" + weak.group() + "\u201d; check it is about admission.");
        }
        return null;
    }

    // --- facts ----------------------------------------------------------------------------------------------------

    private static final Pattern CLOSING_CUE = p("last\\s*date|closing\\s*date|clos(es|ed|ing)\\s*on|apply\\s*(by|before|till|until|up\\s*to|upto|latest\\s*by)"
            + "|submission\\s*(by|before|till|until|up\\s*to)|on\\s*or\\s*before|extended\\s*(up\\s*)?(to|till|until)|\\btill\\b|\\buntil\\b|\\bup\\s*to\\b|\\bupto\\b"
            + "|अंतिम\\s*(तिथि|तारीख|दिनांक)|अन्तिम\\s*(तिथि|तारीख|दिनांक)|ଶେଷ\\s*ତାରିଖ|শেষ\\s*তারিখ");
    private static final Pattern OPENING_CUE = p("(applications?|registrations?|online\\s*(applications?|registrations?|forms?)|forms?)\\s*(will\\s*)?"
            + "(be\\s*)?(open|start|begin|commence|available)\\w*\\s*(from|on|w\\.?e\\.?f\\.?)?");
    private static final Pattern EXAM_CUE = p("(exam(ination)?|test|interview|entrance)[\\s-]*(will\\s*be\\s*(held|conducted)\\s*)?(on|dated?|date)\\b\\s*:?"
            + "|\\bscheduled\\s*(to\\s*be\\s*(held|conducted)\\s*)?on\\b\\s*:?|\\bto\\s*be\\s*(held|conducted)\\s*on\\b\\s*:?");
    private static final Pattern FROM_TO = p("from\\s*$");
    private static final Pattern SESSION = Pattern.compile("(?<!\\d)(20\\d{2})\\s*[-–/]\\s*(?:20)?(\\d{2})(?!\\d)");
    private static final Pattern CLASS_LIST = p("(?:class(?:es)?|grades?|std\\.?|standard|कक्षा)\\s*[-:]?\\s*((?:\\b(?:xii|xi|x|ix|viii|vii|vi|v|iv|iii|ii|i)\\b|\\d{1,2})"
            + "(?:\\s*(?:,|&|and|to|-|–|/|या|एवं|व)\\s*(?:\\b(?:xii|xi|x|ix|viii|vii|vi|v|iv|iii|ii|i)\\b|\\d{1,2}))*)");
    private static final Pattern PRE_PRIMARY = p("nursery|pre-?primary|\\blkg\\b|\\bukg\\b|\\bk\\.?g\\.?\\b|kindergarten|balvatika|bal\\s*vatika|pre-?school|play\\s*group");
    private static final Pattern VACANCIES = p("(?<![\\d/.-])(\\d{1,5})\\s*(?:nos?\\.?\\s*(?:of\\s*)?)?(?:posts?|vacanc(?:y|ies)|पद|पदों)\\b");
    private static final Pattern PART_TIME = p("part[\\s-]*time|अंशकालिक");
    private static final Pattern INTERVIEW = p("interview|साक्षात्कार");
    private static final Pattern CONTRACT = p("contract(ual)?|संविदा|\\bguest\\b|अतिथि|ad[\\s-]*hoc|outsourc|\\btenure\\b|fixed[\\s-]*term|consolidated|honorarium|मानदेय|engagement");
    private static final Pattern TEMPORARY = p("temporary|leave\\s*vacanc|अस्थायी");
    private static final Pattern REGULAR = p("regular\\s*basis|on\\s*regular|permanent|direct\\s*recruitment|regular\\s*(posts?|appointment)|नियमित");
    private static final String[] ROMAN = {"", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"};

    /**
     * The facts the notice's words state. {@code publishedOn} (the source's date for the notice, or the day it was
     * found) bounds the dates read: a "last date" months before publication or years after it is not believed.
     */
    /**
     * The interview and last dates an official notice's document states (its text, not its title). A document carries
     * other dates too: its letter date, usually right under the heading, and dates of birth or experience. So, after each
     * cue ("walk-in", "interview on", "scheduled on", "last date"), every date within reach is looked at and the first
     * that falls after the notice's publication, and at most {@code maxDays} after it, is taken.
     *
     * @param walkIn the document speaks of a walk-in interview (or an interview for contractual or part-time posts)
     */
    public record DocumentDates(LocalDate closesOn, LocalDate examOn, boolean walkIn) {
    }

    public static DocumentDates documentDates(String text, LocalDate publishedOn, int maxDays) {
        String t = DateText.normaliseDigits(text == null ? "" : text).replace(' ', ' ');
        List<DateText.Found> dates = DateText.all(t);
        boolean walkIn = WALK_IN.matcher(t).find()
                || INTERVIEW.matcher(t).find() && (CONTRACT.matcher(t).find() || PART_TIME.matcher(t).find());
        LocalDate closes = firstInWindow(CLOSING_CUE.matcher(t), dates, 80, publishedOn, maxDays);
        LocalDate exam = firstInWindow(WALK_IN.matcher(t), dates, 160, publishedOn, maxDays);
        if (exam == null) exam = firstInWindow(EXAM_CUE.matcher(t), dates, 60, publishedOn, maxDays);
        return new DocumentDates(closes, exam, walkIn);
    }

    private static LocalDate firstInWindow(Matcher cue, List<DateText.Found> dates, int reach, LocalDate publishedOn, int maxDays) {
        while (cue.find()) {
            for (DateText.Found d : dates) {
                if (d.start() < cue.end()) continue;
                if (d.start() - cue.end() > reach) break;
                if (d.date().isAfter(publishedOn) && !d.date().isAfter(publishedOn.plusDays(maxDays))) {
                    return d.date();
                }
            }
        }
        return null;
    }

    public static Facts facts(SiteUpdate.Category category, String text, LocalDate publishedOn) {
        String t = DateText.normaliseDigits(text == null ? "" : text).replace('\u00a0', ' ');
        boolean job = category == SiteUpdate.Category.JOB;
        SiteUpdate.NoticeType type = noticeType(category, t);
        // "Interview notice for contractual teachers": attended like a walk-in (an opening, not its result).
        boolean walkIn = WALK_IN.matcher(t).find() || job && type == SiteUpdate.NoticeType.OPENING && INTERVIEW.matcher(t).find()
                && (CONTRACT.matcher(t).find() || PART_TIME.matcher(t).find());

        List<String> posts = new ArrayList<>();
        boolean nonSchool = false;
        boolean schoolPost = false;
        boolean schoolStaff = false;
        SiteUpdate.StaffKind staff = null;
        List<String> subjects = List.of();
        SiteUpdate.EmploymentType employment = null;
        Integer vacancies = null;
        List<Position> positions = List.of();
        if (job) {
            StringBuilder work = new StringBuilder(t);
            boolean nonTeachingWord = blank(work, NON_TEACHING);
            boolean teachingWord = TEACHING_WORD.matcher(work).find();
            for (Post post : POSTS) {
                if (blank(work, post.pattern())) {
                    posts.add(post.code());
                }
            }
            boolean anyTeaching = posts.stream().anyMatch(TEACHING_CODES::contains);
            if (!anyTeaching && GENERIC_TEACHER.matcher(work).find()) {
                posts.add("TEACHER");
                anyTeaching = true;
            }
            boolean anyNonTeaching = posts.stream().anyMatch(c -> !TEACHING_CODES.contains(c)) || nonTeachingWord;
            staff = anyTeaching || teachingWord ? (anyNonTeaching ? SiteUpdate.StaffKind.MIXED : SiteUpdate.StaffKind.TEACHING)
                    : anyNonTeaching ? SiteUpdate.StaffKind.NON_TEACHING : null;
            nonSchool = NON_SCHOOL.matcher(t).find();
            schoolPost = anyTeaching || SCHOOL_WORDS.matcher(t).find();
            schoolStaff = posts.stream().anyMatch(c -> Set.of("LIBRARIAN", "COUNSELLOR", "LAB_ASSISTANT", "WARDEN").contains(c));
            if (anyTeaching) {
                subjects = subjects(t);
            }
            employment = PART_TIME.matcher(t).find() ? SiteUpdate.EmploymentType.PART_TIME
                    : CONTRACT.matcher(t).find() || walkIn ? SiteUpdate.EmploymentType.CONTRACT
                    : TEMPORARY.matcher(t).find() ? SiteUpdate.EmploymentType.TEMPORARY
                    : REGULAR.matcher(t).find() ? SiteUpdate.EmploymentType.REGULAR : null;
            if (type == SiteUpdate.NoticeType.OPENING) {
                Matcher v = VACANCIES.matcher(t);
                if (v.find()) {
                    int n = Integer.parseInt(v.group(1));
                    vacancies = n > 0 && n <= 100_000 ? n : null;
                }
            }
            positions = positions(t);
        }
        // "Advertisement No. 5/2026" names no post; "...for the post of Junior Scientific Assistant" does, even one these
        // rules do not know.
        boolean generic = job && posts.isEmpty() && !nonSchool && GENERIC_JOB.matcher(t).find() && !NAMED_POST.matcher(t).find();

        // Dates the words state, each only after its own cue word.
        List<DateText.Found> dates = DateText.all(t);
        LocalDate opens = null;
        LocalDate closes = null;
        LocalDate exam = null;
        Matcher m = OPENING_CUE.matcher(t);
        if (m.find()) {
            opens = near(dates, m.end(), 50, publishedOn, 60, 365);
        }
        for (DateText.Found d : dates) { // "from 1 Dec 2026 to 31 Dec 2026"
            String before = t.substring(Math.max(0, d.start() - 6), d.start());
            if (FROM_TO.matcher(before).find()) {
                DateText.Found next = DateText.firstAfter(dates, d.end());
                if (next != null && next.start() - d.end() <= 12 && !next.date().isBefore(d.date())) {
                    if (opens == null && plausible(d.date(), publishedOn, 60, 365)) opens = d.date();
                    if (plausible(next.date(), publishedOn, 30, 400)) closes = next.date();
                }
                break;
            }
        }
        m = CLOSING_CUE.matcher(t);
        while (closes == null && m.find()) {
            closes = near(dates, m.end(), 80, publishedOn, 30, 400);
        }
        if (walkIn) {
            // The posts are usually listed between "walk-in interview for" and its date.
            Matcher w = WALK_IN.matcher(t);
            if (w.find()) {
                exam = near(dates, w.end(), 160, publishedOn, 30, 400);
            }
        }
        m = EXAM_CUE.matcher(t);
        if (exam == null && m.find()) {
            exam = near(dates, m.end(), 40, publishedOn, 30, 400);
        }
        if (walkIn && closes == null && exam != null) {
            closes = exam; // a walk-in interview is applied for by attending it
        }
        if (opens != null && closes != null && opens.isAfter(closes)) {
            opens = null;
        }
        String session = session(t);
        String classes = category == SiteUpdate.Category.ADMISSION ? classes(t) : null;
        return new Facts(type, List.copyOf(posts), subjects, staff, employment, schoolPost, schoolStaff, nonSchool, generic, walkIn,
                session, classes, opens, closes, exam, vacancies, positions);
    }

    static SiteUpdate.NoticeType noticeType(SiteUpdate.Category category, String t) {
        if (RULES.matcher(t).find()) return SiteUpdate.NoticeType.OTHER; // recruitment rules are not an opening
        if (ADMIT_CARD.matcher(t).find()) return SiteUpdate.NoticeType.ADMIT_CARD;
        if (RESULT.matcher(t).find()) return SiteUpdate.NoticeType.RESULT;
        if (CORRIGENDUM.matcher(t).find()) return SiteUpdate.NoticeType.CORRIGENDUM;
        if (EXTENSION.matcher(t).find()) return SiteUpdate.NoticeType.EXTENSION;
        if (WALK_IN.matcher(t).find()) return SiteUpdate.NoticeType.OPENING;
        // "Interview notice for contractual teachers": a school's call to come for its contractual posts, an opening.
        if (category == SiteUpdate.Category.JOB && INTERVIEW.matcher(t).find()
                && (CONTRACT.matcher(t).find() || PART_TIME.matcher(t).find())) return SiteUpdate.NoticeType.OPENING;
        if (SCHEDULE.matcher(t).find()) return SiteUpdate.NoticeType.SCHEDULE;
        Pattern opening = category == SiteUpdate.Category.ADMISSION ? ADMISSION_OPENING : JOB_OPENING;
        return opening.matcher(t).find() ? SiteUpdate.NoticeType.OPENING : SiteUpdate.NoticeType.OTHER;
    }

    /** Blanks every match of {@code pattern} in {@code work} (same length, so positions stay put); true if any. */
    private static boolean blank(StringBuilder work, Pattern pattern) {
        Matcher m = pattern.matcher(work);
        boolean any = false;
        List<int[]> spans = new ArrayList<>();
        while (m.find()) {
            spans.add(new int[]{m.start(), m.end()});
            any = true;
        }
        for (int[] s : spans) {
            for (int i = s[0]; i < s[1]; i++) {
                work.setCharAt(i, ' ');
            }
        }
        return any;
    }

    private static List<String> subjects(String t) {
        StringBuilder work = new StringBuilder(t);
        Set<String> found = new LinkedHashSet<>();
        for (Map.Entry<String, Pattern> s : SUBJECTS) {
            if (blank(work, s.getValue())) {
                found.add(s.getKey());
            }
        }
        return List.copyOf(found);
    }

    private static final Pattern SEPARATORS = p("\\s*(?:,|;|/|&|\\+|\\band\\b|(?<=\\s)(?:एवं|तथा|और)(?=\\s))\\s*");
    private static final Pattern CODE = p("\\b(pgt|tgt|prt|ntt)s?\\b");
    private static final Pattern POST_PREFIX = p("^.*?\\b(?:posts?|vacanc(?:y|ies))\\s+(?:of|for)\\s+");

    /** "PGT English, PGT Hindi and PGT Maths" as three posts; "PGT (Physics, Chemistry)" as two. */
    static List<Position> positions(String t) {
        String text = t.replaceAll("[()\\[\\]]", " ").replaceAll("\\s+", " ").trim();
        List<Position> out = new ArrayList<>();
        Set<String> seen = new LinkedHashSet<>();
        String current = null;
        for (String raw : SEPARATORS.split(text)) {
            String segment = POST_PREFIX.matcher(raw).replaceFirst("").trim();
            if (segment.isEmpty()) {
                continue;
            }
            Matcher code = CODE.matcher(segment);
            String codeHere = code.find() ? code.group(1).toUpperCase(Locale.ROOT) : null;
            if (codeHere != null) {
                current = codeHere;
            }
            List<String> subject = subjects(segment);
            String other = null;
            StringBuilder work = new StringBuilder(segment.toLowerCase(Locale.ROOT));
            blank(work, CODE);
            for (Post post : POSTS) {
                if (!Set.of("PGT", "TGT", "PRT", "NTT").contains(post.code()) && post.pattern().matcher(work).find()) {
                    other = post.code();
                    break;
                }
            }
            if ("ASSISTANT_MASTER".equals(other)) {
                current = other; // "Assistant Masters in Physics, Chemistry & Biology": the subjects that follow are its posts too
            }
            String type = other != null ? other : codeHere != null ? codeHere : !subject.isEmpty() ? current : null;
            if (type == null) {
                continue;
            }
            String postCode = codeHere != null ? codeHere : current;
            String name;
            if (other != null && CATEGORY_CODES.contains(other) && codeHere == null) {
                // A driver or an accountant is a kind of staff here ("Support Staff"), not a post name to list.
                continue;
            } else if (other != null && !CATEGORY_CODES.contains(other)) {
                name = (postCode != null && codeHere != null ? postCode + " " : "") + shortLabel(other);
                if (!subject.isEmpty() && !"PET".equals(other)) name += " (" + subject.get(0) + ")";
            } else {
                name = shortLabel(postCode) + (subject.isEmpty() ? "" : " (" + subject.get(0) + ")");
            }
            if (seen.add(name.toLowerCase(Locale.ROOT)) && out.size() < 30) {
                out.add(new Position(name, type, subject.isEmpty() ? null : subject.get(0)));
            }
        }
        boolean worthListing = out.size() >= 2 || (out.size() == 1 && out.get(0).subject() != null);
        return worthListing ? List.copyOf(out) : List.of();
    }

    /** "PGT", "Assistant Master", "Hostel Warden": a post's name as a list of posts shows it. */
    private static String shortLabel(String code) {
        return Set.of("PGT", "TGT", "PRT", "NTT").contains(code) ? code : postLabel(code).replaceAll(" / .*$", "");
    }

    /** The first date within {@code window} characters after {@code from}, if it is plausible for this notice. */
    private static LocalDate near(List<DateText.Found> dates, int from, int window, LocalDate publishedOn, int daysBefore, int daysAfter) {
        DateText.Found d = DateText.firstAfter(dates, from);
        if (d == null || d.start() - from > window) {
            return null;
        }
        return plausible(d.date(), publishedOn, daysBefore, daysAfter) ? d.date() : null;
    }

    private static boolean plausible(LocalDate d, LocalDate publishedOn, int daysBefore, int daysAfter) {
        if (publishedOn == null) {
            return true;
        }
        return !d.isBefore(publishedOn.minusDays(daysBefore)) && !d.isAfter(publishedOn.plusDays(daysAfter));
    }

    static String session(String t) {
        Matcher m = SESSION.matcher(t);
        while (m.find()) {
            int first = Integer.parseInt(m.group(1));
            int second = Integer.parseInt(m.group(2));
            if (second == (first + 1) % 100) {
                return first + "-" + String.format(Locale.ROOT, "%02d", second);
            }
        }
        return null;
    }

    static String classes(String t) {
        Set<String> found = new LinkedHashSet<>();
        if (PRE_PRIMARY.matcher(t).find()) {
            found.add("Nursery/KG");
        }
        Matcher m = CLASS_LIST.matcher(t);
        while (m.find()) {
            String[] tokens = m.group(1).split("\\s*(?:,|&|and|-|–|/|या|एवं|व)\\s*");
            for (String token : tokens) {
                String[] range = token.split("\\s+to\\s+");
                String a = roman(range[0]);
                if (a == null) continue;
                if (range.length == 2 && roman(range[1]) != null) {
                    found.add(a + "–" + roman(range[1]));
                } else {
                    found.add(a);
                }
            }
        }
        if (found.isEmpty()) {
            return null;
        }
        String joined = String.join(", ", found);
        return joined.length() <= 80 ? joined : null;
    }

    private static String roman(String token) {
        String s = token.trim().toUpperCase(Locale.ROOT);
        if (s.matches("\\d{1,2}")) {
            int n = Integer.parseInt(s);
            return n >= 1 && n <= 12 ? ROMAN[n] : null;
        }
        for (int i = 1; i < ROMAN.length; i++) {
            if (ROMAN[i].equals(s)) return s;
        }
        return null;
    }
}
