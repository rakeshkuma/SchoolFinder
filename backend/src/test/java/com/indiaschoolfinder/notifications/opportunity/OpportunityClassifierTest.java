package com.indiaschoolfinder.notifications.opportunity;

import com.indiaschoolfinder.entity.SiteUpdate;
import com.indiaschoolfinder.entity.SiteUpdate.Category;
import com.indiaschoolfinder.entity.SiteUpdate.NoticeType;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.EnumSet;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

/** The classifier against titles exactly as official sites printed them (KVS, NVS, DSSSB, NESTS, OAV, Sainik Schools). */
class OpportunityClassifierTest {

    private static final Set<Category> BOTH = EnumSet.of(Category.ADMISSION, Category.JOB);

    private static OpportunityClassifier.Facts job(String title, String published) {
        return OpportunityClassifier.facts(Category.JOB, title, LocalDate.parse(published));
    }

    private static OpportunityClassifier.Facts admission(String title, String published) {
        return OpportunityClassifier.facts(Category.ADMISSION, title, LocalDate.parse(published));
    }

    @Test
    void resultForOnePostWithSubject() {
        var f = job("Final Result for the Post of TGT ( Social Science) on Regular Basis", "2026-11-17");
        assertThat(f.noticeType()).isEqualTo(NoticeType.RESULT);
        assertThat(f.postTypes()).containsExactly("TGT");
        assertThat(f.subjects()).containsExactly("Social Science");
        assertThat(f.employmentType()).isEqualTo(SiteUpdate.EmploymentType.REGULAR);
        assertThat(f.staffKind()).isEqualTo(SiteUpdate.StaffKind.TEACHING);
        assertThat(f.positions()).extracting(OpportunityClassifier.Position::postName).containsExactly("TGT (Social Science)");
        assertThat(f.schoolPost()).isTrue();
        assertThat(f.closesOn()).isNull();
    }

    @Test
    void severalPostsOfOneNoticeBecomePositions() {
        var f = job("Notice Regarding Tier-II examination Result for the post of PGT English, PGT Hindi and PGT Maths", "2026-11-10");
        assertThat(f.noticeType()).isEqualTo(NoticeType.RESULT);
        assertThat(f.positions()).extracting(OpportunityClassifier.Position::postName)
                .containsExactly("PGT (English)", "PGT (Hindi)", "PGT (Mathematics)");
        assertThat(f.subjects()).containsExactly("Mathematics", "English", "Hindi");
    }

    @Test
    void generalAdvertisementWithClosingDateInItsTitle() {
        var f = job("VACANCY NOTICE / ADVERTISEMENT NO. 03/2026 for various Posts from Post code 21/26 to 45/26. "
                + "Closing Date for Submission of Online Applications : - 15/07/2026", "2026-06-01");
        assertThat(f.noticeType()).isEqualTo(NoticeType.OPENING);
        assertThat(f.closesOn()).isEqualTo(LocalDate.of(2026, 7, 15));
        assertThat(f.generic()).isTrue();
        assertThat(f.schoolPost()).isFalse();
        assertThat(f.postTypes()).isEmpty();
    }

    @Test
    void primaryTeacherCorrigendumOfTheDirectorateOfEducation() {
        var f = job("Corrigendum regarding partial modification to the Advertisement No. 05/2025 dated 10.09.2025 i.r.o. post of "
                + "Assistant Teacher (Primary), under post code 802/25 in DoE.", "2026-05-18");
        assertThat(f.noticeType()).isEqualTo(NoticeType.CORRIGENDUM);
        assertThat(f.postTypes()).containsExactly("PRT");
        assertThat(f.schoolPost()).isTrue();
        assertThat(f.closesOn()).isNull(); // 10.09.2025 is the advertisement's date, not a last date
    }

    @Test
    void postsThatAreNotSchoolEmployment() {
        var project = job("Advertisement for Engagement of Senior Project Associate, Project Associate-II & Project Assistant under "
                + "Vigyan Jyoti Programme Phase-VII", "2026-10-21");
        assertThat(project.noticeType()).isEqualTo(NoticeType.OPENING); // "Programme" is not a schedule
        assertThat(project.nonSchoolPost()).isTrue();
        assertThat(project.schoolPost()).isFalse();
        assertThat(project.employmentType()).isEqualTo(SiteUpdate.EmploymentType.CONTRACT);

        var engineer = job("Notice for Extension of last date of application for filling up the post of Superintending Engineer", "2026-11-05");
        assertThat(engineer.noticeType()).isEqualTo(NoticeType.EXTENSION);
        assertThat(engineer.nonSchoolPost()).isTrue();
        assertThat(engineer.closesOn()).isNull(); // "last date" with no date after it
    }

    @Test
    void kindsOfStaffAreFiltersNotPostNamesAndRulesAreNotOpenings() {
        // An engineer is not "support staff" of a school system: no post type, and no post name to show.
        var engineer = job("Notice for Extension of last date of application for filling up the post of Superintending Engineer", "2026-11-05");
        assertThat(engineer.postTypes()).isEmpty();
        assertThat(engineer.postNames()).isEmpty();
        var driver = job("Recruitment of Driver and Cook for the school", "2026-11-05");
        assertThat(driver.postTypes()).containsExactly("SUPPORT_STAFF");
        assertThat(driver.postNames()).isEmpty(); // "Support Staff" names no post
        assertThat(job("Recruitment of TGT Maths and Librarian", "2026-11-05").postNames()).containsExactly("TGT (Mathematics)", "Librarian");
        assertThat(job("Notification dated 11.02.2026 regarding Revised Recruitment Rules - 2026 of various posts", "2026-10-07").noticeType())
                .isEqualTo(NoticeType.OTHER);
        assertThat(OpportunityClassifier.namesAPost("PGT")).isTrue();
        assertThat(OpportunityClassifier.namesAPost("SUPPORT_STAFF")).isFalse();
    }

    @Test
    void rashtriyaMilitarySchoolTitles() {
        var dholpur = job("RMS DHOLPUR: RECRUITMENT OF ASSISTANT MASTERS IN PHYSICS, CHEMISTRY, MATHEMATICS & COMPUTER SCIENCE", "2026-11-14");
        assertThat(dholpur.noticeType()).isEqualTo(NoticeType.OPENING);
        assertThat(dholpur.postTypes()).containsExactly("ASSISTANT_MASTER");
        assertThat(dholpur.staffKind()).isEqualTo(SiteUpdate.StaffKind.TEACHING);
        assertThat(dholpur.positions()).extracting(OpportunityClassifier.Position::postName).containsExactly(
                "Assistant Master (Physics)", "Assistant Master (Chemistry)", "Assistant Master (Mathematics)", "Assistant Master (Computer Science)");
        assertThat(job("RMS AJMER: EMPLOYMENT NOTICE FOR THE POST OF ASSISTANT MASTER OF GROUP 'B'", "2026-11-14").noticeType())
                .isEqualTo(NoticeType.OPENING);
        assertThat(job("RMS CHAIL: NOTICE FOR WRITTEN TEST ALONG WITH INTERVIEW OF ASSISTANT MASTER", "2026-11-14").noticeType())
                .isEqualTo(NoticeType.SCHEDULE);
        assertThat(OpportunityClassifier.relevance("RMS BENGALURU: RECRUITMENT OF ASSISTANT MASTERS IN ENGLISH SUBJECT",
                Set.of(Category.JOB)).category()).isEqualTo(Category.JOB);
    }

    @Test
    void teachingAndNonTeachingRecruitment() {
        var f = job("Recruitment Notification No.1/2025 - Filling up the Teaching and Non-Teaching posts in NVS", "2026-10-07");
        assertThat(f.noticeType()).isEqualTo(NoticeType.OPENING);
        assertThat(f.staffKind()).isEqualTo(SiteUpdate.StaffKind.MIXED);
        assertThat(f.nonSchoolPost()).isFalse();
    }

    @Test
    void hindiWalkInInterviewForContractTeachers() {
        var f = job("संविदा शिक्षकों के लिए वॉक-इन-इंटरव्यू 05.08.2026 को", "2026-08-03");
        assertThat(f.noticeType()).isEqualTo(NoticeType.OPENING);
        assertThat(f.walkIn()).isTrue();
        assertThat(f.examOn()).isEqualTo(LocalDate.of(2026, 8, 5));
        assertThat(f.closesOn()).isEqualTo(LocalDate.of(2026, 8, 5));
        assertThat(f.employmentType()).isEqualTo(SiteUpdate.EmploymentType.CONTRACT);
        assertThat(f.postTypes()).containsExactly("TEACHER");
        assertThat(f.staffKind()).isEqualTo(SiteUpdate.StaffKind.TEACHING);
    }

    @Test
    void leadershipAndBoardingPosts() {
        var f = job("Walk-in interview for Vice Principal, Headmistress (Junior School), Housemaster and Hostel Warden on 12 December 2026",
                "2026-11-20");
        assertThat(f.postTypes()).containsExactly("VICE_PRINCIPAL", "HEADMASTER", "WARDEN");
        assertThat(f.staffKind()).isEqualTo(SiteUpdate.StaffKind.MIXED);
        assertThat(f.closesOn()).isEqualTo(LocalDate.of(2026, 12, 12));
    }

    @Test
    void admissionWithLastDateClassesAndSession() {
        var oav = admission("The online registration process for the entrance examination for admission to Odisha Adarsha Vidyalaya, "
                + "Odisha Mining Adarsha Vidyalaya, and Iconic Adarsha Vidyalaya is underway. The last date for applying is 16.11.2026", "2026-10-28");
        assertThat(oav.noticeType()).isEqualTo(NoticeType.OPENING);
        assertThat(oav.closesOn()).isEqualTo(LocalDate.of(2026, 11, 16));

        var classes = admission("Admission to Class VI and IX for the session 2027-28; last date 15 December 2026", "2026-11-19");
        assertThat(classes.classes()).isEqualTo("VI, IX");
        assertThat(classes.academicSession()).isEqualTo("2027-28");
        assertThat(classes.closesOn()).isEqualTo(LocalDate.of(2026, 12, 15));

        var nursery = admission("Nursery and Class 1 admission 2027-28: registration from 1 December 2026 to 31 December 2026", "2026-11-25");
        assertThat(nursery.classes()).isEqualTo("Nursery/KG, I");
        assertThat(nursery.opensOn()).isEqualTo(LocalDate.of(2026, 12, 1));
        assertThat(nursery.closesOn()).isEqualTo(LocalDate.of(2026, 12, 31));
    }

    @Test
    void indianDigitsAreRead() {
        var f = admission("ଆବେଦନ କରିବାର ଶେଷ ତାରିଖ ୨୫.୧୧.୨୦୨୬", "2026-11-10");
        assertThat(f.closesOn()).isEqualTo(LocalDate.of(2026, 11, 25));
    }

    @Test
    void implausibleDatesAreNotBelieved() {
        var f = job("Recruitment of PGT Physics, last date 15/07/2019", "2026-11-01");
        assertThat(f.closesOn()).isNull();
    }

    @Test
    void whatCountsAsAnAdmissionOrJobNotice() {
        assertThat(OpportunityClassifier.relevance("RFP SUPPLY OF EGG 2026", BOTH)).isNull();
        assertThat(OpportunityClassifier.relevance("1_Hiring of Shamiyana", BOTH)).isNull();
        assertThat(OpportunityClassifier.relevance("WINTER VACATION HOME WORK", BOTH)).isNull();
        assertThat(OpportunityClassifier.relevance("FEE STRUCTURE", BOTH)).isNull();
        assertThat(OpportunityClassifier.relevance("RESULTS", BOTH)).isNull();
        assertThat(OpportunityClassifier.relevance("Promotion List of PGT Biology 2027", Set.of(Category.ADMISSION))).isNull();

        var tgt = OpportunityClassifier.relevance("TGT MATHS", BOTH);
        assertThat(tgt.category()).isEqualTo(Category.JOB);
        assertThat(tgt.certain()).isTrue();

        var aissee = OpportunityClassifier.relevance("AISSEE 2027 DETAILS", BOTH);
        assertThat(aissee.category()).isEqualTo(Category.ADMISSION);
        assertThat(aissee.certain()).isTrue();

        var ap = OpportunityClassifier.relevance("AP Registration @GSIS May 2027", BOTH);
        assertThat(ap.category()).isEqualTo(Category.ADMISSION);
        assertThat(ap.certain()).isFalse();
        assertThat(ap.reason()).contains("Registration");

        var advert = OpportunityClassifier.relevance("Website Advertisement Oct 2026", BOTH);
        assertThat(advert.category()).isEqualTo(Category.JOB);
        assertThat(advert.certain()).isFalse();

        // "hra" inside a name is not the house rent allowance
        assertThat(OpportunityClassifier.relevance("Interview for TGT post - Mr. R. Mishra", BOTH)).isNotNull();
    }

    @Test
    void admitCardsAreNotOpenings() {
        assertThat(OpportunityClassifier.facts(Category.ADMISSION, "Click here to download the admit card for class VI JNVST 2027",
                LocalDate.of(2026, 10, 29)).noticeType()).isEqualTo(NoticeType.ADMIT_CARD);
        assertThat(OpportunityClassifier.facts(Category.ADMISSION, "कक्षा VI JNVST 2027 का प्रवेश पत्र डाउनलोड करने हेतु यहाँ क्लिक करें।",
                LocalDate.of(2026, 10, 29)).noticeType()).isEqualTo(NoticeType.ADMIT_CARD);
    }
}
