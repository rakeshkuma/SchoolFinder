package com.indiaschoolfinder.service;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * baseSalary only from pay a notice publishes, and only when it is unambiguous (Search Console, 24 Nov 2026, reported it
 * missing; Google asks for the salary the employer states, never an estimate).
 */
class JobPostingSalaryTest {

    @SuppressWarnings("unchecked")
    private static Map<String, Object> value(String text) {
        Map<String, Object> salary = SeoHeadService.baseSalary(text);
        assertThat(salary).as(text).isNotNull().containsEntry("@type", "MonetaryAmount").containsEntry("currency", "INR");
        return (Map<String, Object>) salary.get("value");
    }

    @Test
    void oneAmountForOnePeriod() {
        assertThat(value("₹27,500 per month (consolidated)")).containsEntry("value", new BigDecimal("27500")).containsEntry("unitText", "MONTH");
        assertThat(value("Rs. 3,00,000/- per annum")).containsEntry("value", new BigDecimal("300000")).containsEntry("unitText", "YEAR");
        assertThat(value("INR 1,200 per day")).containsEntry("value", new BigDecimal("1200")).containsEntry("unitText", "DAY");
        assertThat(value("₹26250 प्रति माह")).containsEntry("unitText", "MONTH");
    }

    @Test
    void aRangeForOnePeriod() {
        assertThat(value("Rs. 21,250/- to Rs. 27,500/- per month")).containsEntry("minValue", new BigDecimal("21250"))
                .containsEntry("maxValue", new BigDecimal("27500")).containsEntry("unitText", "MONTH");
        assertThat(value("₹44,900–1,42,400 per month (Level 7)")).containsEntry("minValue", new BigDecimal("44900"))
                .containsEntry("maxValue", new BigDecimal("142400"));
    }

    @Test
    void nothingWhenThePayIsNotStatedPlainly() {
        assertThat(SeoHeadService.baseSalary(null)).isNull();
        assertThat(SeoHeadService.baseSalary("As per KVS norms")).isNull();
        // No period: a pay level is not assumed to be monthly.
        assertThat(SeoHeadService.baseSalary("₹44,900–1,42,400 (Level 7)")).isNull();
        // Two posts' different pay is not one salary.
        assertThat(SeoHeadService.baseSalary("PGT ₹27,500 and TGT ₹26,250 per month")).isNull();
        // Two periods at once.
        assertThat(SeoHeadService.baseSalary("₹27,500 per month or ₹3,30,000 per annum")).isNull();
        // A range the wrong way round.
        assertThat(SeoHeadService.baseSalary("₹30,000 to ₹20,000 per month")).isNull();
        // A number without a currency is not read as pay.
        assertThat(SeoHeadService.baseSalary("Level 7, 30 posts per month")).isNull();
    }
}
