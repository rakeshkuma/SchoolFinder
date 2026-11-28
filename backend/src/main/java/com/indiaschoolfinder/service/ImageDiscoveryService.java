package com.indiaschoolfinder.service;

import com.indiaschoolfinder.dto.school.ImageAdminDtos.ImageCandidate;

import java.util.List;
import java.util.Optional;

/**
 * Finds possible school photographs on sources that publish a licence for every file (Wikimedia Commons, and the lead
 * images of Wikipedia articles when the file is hosted on Commons). It never scrapes search engines and never stores
 * anything: an administrator checks each candidate and adds it as PENDING.
 */
public interface ImageDiscoveryService {

    /** Candidates for the query, Wikipedia article images first; at most {@code limit} results. */
    List<ImageCandidate> search(String query, int limit);

    /** The current Commons record of one file, e.g. "File:Netarhat School.jpg"; empty when Commons has no such file. */
    Optional<ImageCandidate> commonsFile(String fileTitle);
}
