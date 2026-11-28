package com.indiaschoolfinder.exception;

import com.indiaschoolfinder.dto.common.ApiError;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.transaction.CannotCreateTransactionException;

import java.time.Clock;

import static org.assertj.core.api.Assertions.assertThat;

class GlobalExceptionHandlerTest {

    private final GlobalExceptionHandler handler = new GlobalExceptionHandler(Clock.systemUTC());
    private final MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/v1/schools/search");

    @Test
    void databaseOutageIsATemporary503WithoutInternals() {
        for (Exception ex : new Exception[] {
                new DataAccessResourceFailureException("Connection to localhost:5432 refused"),
                new CannotCreateTransactionException("Could not open JPA EntityManager for transaction")}) {
            ResponseEntity<ApiError> response = handler.databaseUnavailable(ex, request);
            assertThat(response.getStatusCode().value()).isEqualTo(503);
            assertThat(response.getBody().message()).doesNotContain("localhost", "JPA", "5432");
            assertThat(response.getBody().path()).isEqualTo("/api/v1/schools/search");
        }
    }

    @Test
    void unexpectedErrorsStay500AndHideTheCause() {
        ResponseEntity<ApiError> response = handler.unexpected(new NullPointerException("school.city is null"), request);
        assertThat(response.getStatusCode().value()).isEqualTo(500);
        assertThat(response.getBody().message()).isEqualTo("An unexpected error occurred");
    }
}
