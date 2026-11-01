package com.indiaschoolfinder.enums;

/** What a publisher produces; green-school ratings are listed separately from survey rankings. */
public enum RankingPublisherKind {
    /** A ranked list built from a survey or published scores. */
    SURVEY,
    /** Awards or recognitions without a full ranked list. */
    AWARD,
    /** Environmental or sustainability ratings of schools. */
    GREEN,
    OTHER
}
