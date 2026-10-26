package com.indiaschoolfinder.enums;

/**
 * RANKED: enough verified evidence for a definitive position.
 * PROVISIONAL: scored from the evidence that exists, but verified evidence covers too little weight for a position.
 * NOT_YET_RANKED: no usable evidence; the school is not scored at all.
 */
public enum RankingStatus {
    RANKED,
    PROVISIONAL,
    NOT_YET_RANKED
}
