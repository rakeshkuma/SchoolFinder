package com.indiaschoolfinder.util;

public final class GeoUtil {

    public static final double EARTH_RADIUS_KM = 6371.0;

    private GeoUtil() {
    }

    /** Degrees of latitude/longitude spanned by radiusKm around a point (for bounding-box prefilters). */
    public static BoundingBox boundingBox(double lat, double lon, double radiusKm) {
        double latDelta = Math.toDegrees(radiusKm / EARTH_RADIUS_KM);
        double lonDelta = Math.toDegrees(radiusKm / (EARTH_RADIUS_KM * Math.cos(Math.toRadians(lat))));
        return new BoundingBox(lat - latDelta, lat + latDelta, lon - lonDelta, lon + lonDelta);
    }

    public static double haversineKm(double lat1, double lon1, double lat2, double lon2) {
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.pow(Math.sin(dLat / 2), 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2)) * Math.pow(Math.sin(dLon / 2), 2);
        return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a));
    }

    public record BoundingBox(double minLat, double maxLat, double minLon, double maxLon) {
    }
}
