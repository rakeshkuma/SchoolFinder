package com.indiaschoolfinder.dto.common;

import java.util.List;

/** Lists of schools compiled by the site. They carry no rank, so nothing here can be read as one. */
public final class SchoolListDtos {

    private SchoolListDtos() {
    }

    public record Summary(String key, String kind, String code, String title, long entries, long profiles) {
    }

    /** One school in a list. {@code schoolId} and {@code slug} are null until a directory school can be matched. */
    public record Item(long id, String name, String place, String board, String type, String websiteUrl, Long schoolId, String slug,
                       String imageUrl, String imageCredit) {
    }

    /** The file these lists are loaded from. */
    public record Seed(int version, List<SeedList> lists) {
    }

    public record SeedList(String key, String kind, String code, String title, List<SeedItem> items) {
    }

    public record SeedItem(String name, String place, String stateCode, String board, String type, String website) {
    }
}
