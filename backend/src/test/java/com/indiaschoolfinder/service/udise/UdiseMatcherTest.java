package com.indiaschoolfinder.service.udise;

import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class UdiseMatcherTest {

    private static UdiseMatcher.School school(long id, String name, String state, String pin) {
        return new UdiseMatcher.School(id, name, state, pin, null, null);
    }

    private static UdiseMatcher.Row row(int line, String code, String name, String state, String pin) {
        return new UdiseMatcher.Row(line, code, name, state, pin, null);
    }

    private static List<UdiseMatcher.Result> run(List<UdiseMatcher.School> schools, List<UdiseMatcher.Row> rows) {
        return UdiseMatcher.match(UdiseMatcher.index(schools), rows, Map.of());
    }

    @Test
    void abbreviationsAndCaseDoNotStopAMatch() {
        assertThat(UdiseMatcher.similarity("Dashmesh Pub School", "DASHMESH PUBLIC SCHOOL")).isEqualTo(1.0);
        assertThat(UdiseMatcher.similarity("St. Xavier's Sr. Sec. School", "SAINT XAVIERS SENIOR SECONDARY SCHOOL")).isEqualTo(1.0);
        assertThat(UdiseMatcher.similarity("Kendriya Vidyalaya No. 1", "KV NO 1")).isEqualTo(1.0);
    }

    @Test
    void sameStatePinAndNameIsAVerifiedMatch() {
        List<UdiseMatcher.Result> r = run(List.of(school(1, "Dashmesh Pub School", "DL", "110096")),
                List.of(row(2, "07040123456", "DASHMESH PUBLIC SCHOOL", "DL", "110096")));
        assertThat(r).singleElement().satisfies(x -> {
            assertThat(x.status()).isEqualTo("VERIFIED_MATCH");
            assertThat(x.udiseCode()).isEqualTo("07040123456");
        });
    }

    @Test
    void aNameAloneNeverMatches() {
        // Same name, different PIN or different state: no candidate at all.
        assertThat(run(List.of(school(1, "Dashmesh Public School", "DL", "110096")),
                List.of(row(2, "07040123456", "DASHMESH PUBLIC SCHOOL", "DL", "110095"),
                        row(3, "03040123456", "DASHMESH PUBLIC SCHOOL", "PB", "110096")))).isEmpty();
    }

    @Test
    void twoSchoolsWithTheSameNameAndPinGoToReview() {
        List<UdiseMatcher.Result> r = run(List.of(school(1, "Government High School", "LA", "194101"), school(2, "Government High School", "LA", "194101")),
                List.of(row(2, "37010100101", "GOVERNMENT HIGH SCHOOL", "LA", "194101")));
        assertThat(r).hasSize(2).allSatisfy(x -> {
            assertThat(x.status()).isEqualTo("PENDING_REVIEW");
            assertThat(x.udiseCode()).isNull();
        });
    }

    @Test
    void twoOfficialRowsForOneSchoolGoToReview() {
        List<UdiseMatcher.Result> r = run(List.of(school(1, "Modern School", "DL", "110001")),
                List.of(row(2, "07050100101", "MODERN SCHOOL", "DL", "110001"), row(3, "07050100102", "MODERN SCHOOL", "DL", "110001")));
        assertThat(r).singleElement().satisfies(x -> assertThat(x.status()).isEqualTo("PENDING_REVIEW"));
    }

    @Test
    void aPartlySimilarNameIsOnlyAPossibleMatch() {
        List<UdiseMatcher.Result> r = run(List.of(school(1, "Bal Bharati Public School Pitampura", "DL", "110034")),
                List.of(row(2, "07060100101", "BAL BHARATI SCHOOL", "DL", "110034")));
        assertThat(r).singleElement().satisfies(x -> {
            assertThat(x.status()).isEqualTo("PENDING_REVIEW");
            assertThat(x.reason()).contains("partly");
        });
    }

    @Test
    void aCodeHeldByAnotherSchoolIsNeverReassigned() {
        List<UdiseMatcher.Result> r = UdiseMatcher.match(UdiseMatcher.index(List.of(school(1, "Dashmesh Public School", "DL", "110096"))),
                List.of(row(2, "07040123456", "DASHMESH PUBLIC SCHOOL", "DL", "110096")), Map.of("07040123456", 99L));
        assertThat(r).singleElement().satisfies(x -> {
            assertThat(x.status()).isEqualTo("PENDING_REVIEW");
            assertThat(x.reason()).contains("#99");
        });
    }
}
