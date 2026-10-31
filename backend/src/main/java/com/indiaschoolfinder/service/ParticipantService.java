package com.indiaschoolfinder.service;

import com.indiaschoolfinder.dto.practice.ParticipantDtos;
import com.indiaschoolfinder.entity.Participant;
import com.indiaschoolfinder.entity.PracticeAttempt;
import com.indiaschoolfinder.exception.AccountException;
import com.indiaschoolfinder.exception.BusinessValidationException;
import com.indiaschoolfinder.exception.ResourceNotFoundException;
import com.indiaschoolfinder.repository.ChallengeRepository;
import com.indiaschoolfinder.repository.ParticipantRepository;
import com.indiaschoolfinder.repository.PracticeAttemptRepository;
import com.indiaschoolfinder.util.Nicknames;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Base64;
import java.util.HexFormat;

/**
 * Leaderboard participants. Guests join with a nickname and get a secret token (kept in their browser; only its hash
 * is stored). Members get a private participant on their first scored attempt, and their earlier attempts are counted
 * then. Nobody is listed publicly without opting in. Accounts are for adults, so members are adults here; under-18s
 * take part as guests, listed only if they declare that a parent or guardian agrees.
 */
@Service
public class ParticipantService {

    private static final SecureRandom RANDOM = new SecureRandom();
    /** Public ids avoid look-alike characters (0/O, 1/I/L). */
    private static final char[] ID_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ".toCharArray();

    private final ParticipantRepository participants;
    private final PracticeAttemptRepository attempts;
    private final PointsService points;
    private final LocationService locations;
    private final JdbcTemplate jdbc;
    private final Clock clock;
    private final ChallengeRepository challenges;

    public ParticipantService(ParticipantRepository participants, PracticeAttemptRepository attempts, PointsService points,
                              LocationService locations, JdbcTemplate jdbc, Clock clock, ChallengeRepository challenges) {
        this.challenges = challenges;
        this.participants = participants;
        this.attempts = attempts;
        this.points = points;
        this.locations = locations;
        this.jdbc = jdbc;
        this.clock = clock;
    }

    // --- guests -----------------------------------------------------------------------------------------------------

    @Transactional
    public ParticipantDtos.Joined joinAsGuest(ParticipantDtos.ProfileRequest request) {
        String token = randomToken();
        Participant p = new Participant();
        p.setPublicId(newPublicId());
        p.setGuestTokenHash(hash(token));
        apply(p, request, false);
        participants.saveAndFlush(p);
        return new ParticipantDtos.Joined(profile(p), token);
    }

    /** The guest holding this token; 401 when the token is unknown (deleted, or never issued). */
    @Transactional(readOnly = true)
    public Participant guest(String token) {
        if (token == null || token.isBlank() || token.length() > 100) {
            throw new AccountException(HttpStatus.UNAUTHORIZED, "PARTICIPANT_TOKEN", "Join the leaderboard first.");
        }
        return participants.findByGuestTokenHash(hash(token.strip()))
                .orElseThrow(() -> new AccountException(HttpStatus.UNAUTHORIZED, "PARTICIPANT_TOKEN",
                        "This browser's leaderboard entry was not found. Join again to take part."));
    }

    @Transactional
    public ParticipantDtos.Profile updateGuest(String token, ParticipantDtos.ProfileRequest request) {
        Participant p = guest(token);
        apply(p, request, false);
        return profile(participants.saveAndFlush(p));
    }

    /** Deletes a guest and every result and point that came with them. */
    @Transactional
    public void deleteGuest(String token) {
        participants.delete(guest(token));
    }

    // --- members ----------------------------------------------------------------------------------------------------

    /**
     * The member's participant, created (private, with a generated nickname) on first use; their attempts saved
     * before then are counted, oldest first.
     */
    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    public Participant member(long accountId) {
        Participant existing = participants.findByAccountId(accountId).orElse(null);
        if (existing != null) return existing;
        Participant p = new Participant();
        p.setAccountId(accountId);
        p.setPublicId(newPublicId());
        p.setNickname("Learner " + p.getPublicId().substring(0, 4));
        p.setAgeBand(Participant.AgeBand.ADULT);
        try {
            p = participants.saveAndFlush(p);
        } catch (DataIntegrityViolationException raced) {
            return participants.findByAccountId(accountId).orElseThrow(() -> raced);
        }
        for (PracticeAttempt a : attempts.findByAccountIdAndParticipantIdIsNullOrderByCreatedAtAscIdAsc(accountId)) {
            jdbc.update("UPDATE practice_attempt SET participant_id = ? WHERE id = ? AND participant_id IS NULL", p.getId(), a.getId());
            a.setParticipantId(p.getId());
            points.award(a);
        }
        return p;
    }

    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    public ParticipantDtos.Profile memberProfile(long accountId) {
        return profile(member(accountId));
    }

    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    public ParticipantDtos.Profile updateMember(long accountId, ParticipantDtos.ProfileRequest request) {
        Participant p = member(accountId);
        apply(p, request, true);
        return profile(participants.saveAndFlush(p));
    }

    /**
     * Moves a guest's results into the member's account (the browser holding the token proves they are the guest's).
     * Points are counted again for the member, so a question both answered correctly still counts once.
     */
    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    public ParticipantDtos.Profile claim(long accountId, String token) {
        Participant guest = guest(token);
        Participant member = member(accountId);
        for (PracticeAttempt a : attempts.findByParticipantIdOrderByCreatedAtAscIdAsc(guest.getId())) {
            LocalDate formerDaily = a.getDailyDate();
            jdbc.update("DELETE FROM points_ledger WHERE attempt_id = ?", a.getId());
            int moved = jdbc.update("""
                    UPDATE practice_attempt SET participant_id = ?, account_id = ?, daily_date = NULL, points = 0
                    WHERE id = ? AND NOT EXISTS (SELECT 1 FROM practice_attempt o WHERE o.participant_id = ? AND o.client_id = ?)""",
                    member.getId(), accountId, a.getId(), member.getId(), a.getClientId());
            if (moved == 0) continue; // the same attempt is already in the account
            a.setParticipantId(member.getId());
            a.setAccountId(accountId);
            if (a.getChallengeId() == null) {
                points.carryOver(a, formerDaily);
            } else if (a.getReviewFlag() == null) { // a flagged or voided challenge attempt still earns nothing
                points.awardChallenge(a, challenges.findById(a.getChallengeId()).orElseThrow(), true);
            }
        }
        // Challenge attempts move too, unless the member has already taken that challenge (the limit is per student).
        jdbc.update("""
                UPDATE challenge_attempt g SET participant_id = ? WHERE g.participant_id = ?
                AND NOT EXISTS (SELECT 1 FROM challenge_attempt m WHERE m.participant_id = ? AND m.challenge_id = g.challenge_id)""",
                member.getId(), guest.getId(), member.getId());
        // Badges come along too (a rank badge could not be earned again), keeping the earlier date.
        jdbc.update("""
                INSERT INTO participant_achievement (participant_id, code, earned_at)
                SELECT ?, code, earned_at FROM participant_achievement WHERE participant_id = ?
                ON CONFLICT (participant_id, code) DO UPDATE SET earned_at = LEAST(participant_achievement.earned_at, EXCLUDED.earned_at)""",
                member.getId(), guest.getId());
        participants.delete(guest);
        return profile(member);
    }

    /** The requester's participant id for "my rank", without creating one: the member's, else the guest token's. */
    @Transactional(readOnly = true)
    public Long find(Long accountId, String guestToken) {
        if (accountId != null) {
            return participants.findByAccountId(accountId).map(Participant::getId).orElse(null);
        }
        if (guestToken == null || guestToken.isBlank() || guestToken.length() > 100) return null;
        return participants.findByGuestTokenHash(hash(guestToken.strip())).map(Participant::getId).orElse(null);
    }

    // --- shared -----------------------------------------------------------------------------------------------------

    public ParticipantDtos.Profile profile(Participant p) {
        Long total = jdbc.queryForObject("SELECT coalesce(sum(points), 0) FROM points_ledger WHERE participant_id = ?",
                Long.class, p.getId());
        Long count = jdbc.queryForObject("SELECT count(*) FROM practice_attempt WHERE participant_id = ?", Long.class, p.getId());
        return new ParticipantDtos.Profile(p.getPublicId(), p.getNickname(), p.getStateCode(), p.getCity(), p.isShowCity(),
                p.getTrack(), p.getAgeBand().name(), p.isPublicListing(), p.isListed(), p.getAccountId() != null,
                total == null ? 0 : total, count == null ? 0 : count);
    }

    private void apply(Participant p, ParticipantDtos.ProfileRequest r, boolean member) {
        if (member && r.age() != ParticipantDtos.AgeConfirmation.ADULT) {
            throw new BusinessValidationException("age", "accounts are for adults; under-18s can take part as guests");
        }
        String problem = Nicknames.problem(r.nickname());
        if (problem != null) throw new BusinessValidationException("nickname", problem);
        p.setNickname(Nicknames.clean(r.nickname()));
        if (r.stateCode() != null) {
            try {
                p.setStateCode(locations.state(r.stateCode()).code());
            } catch (ResourceNotFoundException e) {
                throw new BusinessValidationException("stateCode", "unknown state or union territory");
            }
        } else {
            p.setStateCode(null);
        }
        String city = r.city() == null || r.city().isBlank() ? null : r.city().strip();
        p.setCity(city);
        p.setShowCity(city != null && r.showCity());
        p.setTrack(r.track());
        switch (r.age()) {
            case ADULT -> {
                p.setAgeBand(Participant.AgeBand.ADULT);
                p.setGuardianConsentAt(null);
                p.setConsentMethod(null);
                p.setPublicListing(r.publicListing());
            }
            case MINOR_WITH_GUARDIAN -> {
                p.setAgeBand(Participant.AgeBand.MINOR);
                if (r.publicListing()) {
                    p.setGuardianConsentAt(Instant.now(clock));
                    p.setConsentMethod(Participant.ConsentMethod.GUEST_DECLARATION);
                    p.setPublicListing(true);
                } else {
                    p.setPublicListing(false);
                }
            }
            case MINOR -> {
                p.setAgeBand(Participant.AgeBand.MINOR);
                p.setGuardianConsentAt(null);
                p.setConsentMethod(null);
                p.setPublicListing(false);
            }
        }
    }

    private String newPublicId() {
        for (int i = 0; i < 10; i++) {
            StringBuilder s = new StringBuilder(8);
            for (int j = 0; j < 8; j++) s.append(ID_ALPHABET[RANDOM.nextInt(ID_ALPHABET.length)]);
            if (!participants.existsByPublicId(s.toString())) return s.toString();
        }
        throw new IllegalStateException("could not allocate a participant id");
    }

    private static String randomToken() {
        byte[] bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    static String hash(String token) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(token.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }
}
