package com.indiaschoolfinder.service;

import com.indiaschoolfinder.enums.AdmissionStatus;
import org.springframework.stereotype.Component;

import java.time.LocalDate;

/**
 * Derives an admission status from officially announced dates (both dates inclusive).
 * <ul>
 *   <li>no dates announced → NOT_ANNOUNCED</li>
 *   <li>today before start → UPCOMING</li>
 *   <li>start ≤ today ≤ end (or end not yet announced) → OPEN</li>
 *   <li>today after end → CLOSED</li>
 *   <li>only an end date and it is still in the future → NOT_ANNOUNCED (we cannot claim it is open)</li>
 * </ul>
 * Exceptional cases (extensions, early closure) are handled by an administrator override.
 */
@Component
public class AdmissionStatusResolver {

    public AdmissionStatus resolve(LocalDate start, LocalDate end, LocalDate today) {
        if (start == null && end == null) {
            return AdmissionStatus.NOT_ANNOUNCED;
        }
        if (end != null && today.isAfter(end)) {
            return AdmissionStatus.CLOSED;
        }
        if (start == null) {
            return AdmissionStatus.NOT_ANNOUNCED;
        }
        if (today.isBefore(start)) {
            return AdmissionStatus.UPCOMING;
        }
        return AdmissionStatus.OPEN;
    }
}
