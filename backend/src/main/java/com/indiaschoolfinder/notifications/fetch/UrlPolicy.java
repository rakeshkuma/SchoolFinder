package com.indiaschoolfinder.notifications.fetch;

import java.net.Inet4Address;
import java.net.Inet6Address;
import java.net.InetAddress;
import java.net.URI;
import java.net.URISyntaxException;
import java.util.Locale;
import java.util.Set;

/**
 * What the checker may request: https only, on the default port, to a host on the source's allowlist, never with
 * credentials in the address, and never to an address inside a private network (so a planted link or redirect cannot
 * make the server call itself or its database). Also turns addresses into one canonical form for duplicate checks.
 */
public final class UrlPolicy {

    private UrlPolicy() {
    }

    /** Parses and checks an address against the allowlist; the result is canonical. */
    public static URI check(String url, Set<String> allowedHosts) throws FetchException {
        URI uri = parse(url);
        if (uri == null) {
            throw new FetchException(FetchException.Kind.POLICY, "not a valid address: " + abbreviate(url));
        }
        checkUri(uri, allowedHosts);
        return uri;
    }

    public static void checkUri(URI uri, Set<String> allowedHosts) throws FetchException {
        if (!"https".equalsIgnoreCase(uri.getScheme())) {
            throw new FetchException(FetchException.Kind.POLICY, "only https addresses are fetched: " + abbreviate(uri.toString()));
        }
        if (uri.getRawUserInfo() != null) {
            throw new FetchException(FetchException.Kind.POLICY, "addresses with credentials are refused");
        }
        if (uri.getPort() != -1 && uri.getPort() != 443) {
            throw new FetchException(FetchException.Kind.POLICY, "only the standard https port is allowed: " + uri.getHost());
        }
        String host = uri.getHost() == null ? "" : uri.getHost().toLowerCase(Locale.ROOT);
        if (host.isEmpty() || isIpLiteral(host)) {
            throw new FetchException(FetchException.Kind.POLICY, "a host name is required (no bare IP addresses): " + abbreviate(uri.toString()));
        }
        if (!allowedHosts.contains(host)) {
            throw new FetchException(FetchException.Kind.POLICY, "host is not on this source's allowlist: " + host);
        }
    }

    /** True when the address is on the allowlist and https (no network lookup). */
    public static boolean allowed(String url, Set<String> allowedHosts) {
        try {
            check(url, allowedHosts);
            return true;
        } catch (FetchException e) {
            return false;
        }
    }

    /** Refuses loopback, private, link-local, carrier-grade NAT, multicast, reserved and unique-local addresses. */
    public static boolean isPublic(InetAddress a) {
        if (a.isAnyLocalAddress() || a.isLoopbackAddress() || a.isLinkLocalAddress() || a.isSiteLocalAddress()
                || a.isMulticastAddress()) {
            return false;
        }
        byte[] b = a.getAddress();
        if (a instanceof Inet4Address) {
            int o0 = b[0] & 0xff;
            int o1 = b[1] & 0xff;
            return !(o0 == 0 || o0 >= 240                       // this network, reserved, broadcast
                    || (o0 == 100 && o1 >= 64 && o1 <= 127)        // carrier-grade NAT 100.64.0.0/10
                    || (o0 == 192 && o1 == 0 && (b[2] & 0xff) == 0) // 192.0.0.0/24
                    || (o0 == 198 && (o1 == 18 || o1 == 19))       // benchmarking 198.18.0.0/15
                    || (o0 == 169 && o1 == 254));                  // link-local (cloud metadata)
        }
        if (a instanceof Inet6Address) {
            int first = b[0] & 0xff;
            if ((first & 0xfe) == 0xfc) {
                return false; // unique local fc00::/7
            }
            boolean mapped = true; // ::ffff:a.b.c.d — judge the IPv4 address inside
            for (int i = 0; i < 10; i++) {
                mapped &= b[i] == 0;
            }
            if (mapped && (b[10] & 0xff) == 0xff && (b[11] & 0xff) == 0xff) {
                try {
                    return isPublic(InetAddress.getByAddress(new byte[] {b[12], b[13], b[14], b[15]}));
                } catch (java.net.UnknownHostException e) {
                    return false;
                }
            }
        }
        return true;
    }

    /**
     * One spelling per address: lower-case scheme and host, no default port, no fragment, spaces encoded. The path and
     * query keep their case (servers such as NTA's treat ".PDF" and ".pdf" as different files). Null if unparsable.
     */
    public static String canonical(String url) {
        URI uri = parse(url);
        return uri == null ? null : uri.toString();
    }

    static URI parse(String url) {
        if (url == null || url.isBlank()) {
            return null;
        }
        String s = url.trim().replace(" ", "%20").replace("\\", "/");
        try {
            URI u = new URI(s);
            if (u.getScheme() == null || u.getHost() == null) {
                return null;
            }
            int port = u.getPort();
            String scheme = u.getScheme().toLowerCase(Locale.ROOT);
            if (("https".equals(scheme) && port == 443) || ("http".equals(scheme) && port == 80)) {
                port = -1;
            }
            String path = u.getRawPath() == null || u.getRawPath().isEmpty() ? "/" : u.getRawPath();
            StringBuilder b = new StringBuilder(scheme).append("://");
            if (u.getRawUserInfo() != null) {
                b.append(u.getRawUserInfo()).append('@');
            }
            b.append(u.getHost().toLowerCase(Locale.ROOT));
            if (port != -1) {
                b.append(':').append(port);
            }
            b.append(path);
            if (u.getRawQuery() != null) {
                b.append('?').append(u.getRawQuery());
            }
            return new URI(b.toString());
        } catch (URISyntaxException e) {
            return null;
        }
    }

    private static boolean isIpLiteral(String host) {
        return host.startsWith("[") || host.matches("\\d{1,3}(\\.\\d{1,3}){3}");
    }

    static String abbreviate(String s) {
        if (s == null) {
            return "";
        }
        return s.length() <= 120 ? s : s.substring(0, 117) + "...";
    }
}
