package com.indiaschoolfinder.dto.practice;

/**
 * How a practice session's questions were chosen. SET is one published set as written; REVIEW replays given question
 * ids (retake, retry incorrect, revision of earlier mistakes); the others draw from the whole bank.
 */
public enum PracticeMode {
    SET, QUICK, TOPIC, MINI_MOCK, FULL, DAILY, REVISION, RETRY
}
