package com.indiaschoolfinder.enums;

/**
 * The residential-school system a school belongs to. Systems have different missions, admission rules and fee models,
 * so lists compare schools within a system or label clearly when they mix systems.
 */
public enum ResidentialSystem {
    /** Jawahar Navodaya Vidyalayas (Navodaya Vidyalaya Samiti). */
    NAVODAYA(true, false),
    /** Sainik Schools Society schools and approved New Sainik Schools. */
    SAINIK(true, true),
    /** Rashtriya Military Schools (Ministry of Defence). */
    MILITARY_SCHOOL(true, true),
    /** Rashtriya Indian Military College. */
    MILITARY_COLLEGE(true, true),
    /** State-government residential schools, e.g. Netarhat Awasiya Vidyalaya. */
    STATE_RESIDENTIAL(true, false),
    /** Eklavya Model Residential Schools and other tribal-welfare residential schools. */
    TRIBAL_RESIDENTIAL(true, false),
    /** Privately managed boarding schools. */
    PRIVATE_BOARDING(false, false);

    private final boolean government;
    private final boolean defence;

    ResidentialSystem(boolean government, boolean defence) {
        this.government = government;
        this.defence = defence;
    }

    public boolean isGovernment() {
        return government;
    }

    public boolean isDefence() {
        return defence;
    }
}
