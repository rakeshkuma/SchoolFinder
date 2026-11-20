package com.indiaschoolfinder.notifications.fetch;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.regex.Pattern;

/**
 * The parts of robots.txt the checker obeys: the group for our user agent (or "*" when there is none), with Allow and
 * Disallow paths, "*" wildcards and "$" ends. The longest matching rule wins; on a tie, Allow wins.
 */
public final class RobotsRules {

    private record Rule(boolean allow, String path, Pattern pattern) {
    }

    private static final RobotsRules ALLOW_ALL = new RobotsRules(List.of());

    private final List<Rule> rules;

    private RobotsRules(List<Rule> rules) {
        this.rules = rules;
    }

    public static RobotsRules allowAll() {
        return ALLOW_ALL;
    }

    /** @param agentToken our product token, e.g. "SchoolDhundoBot" */
    public static RobotsRules parse(String text, String agentToken) {
        if (text == null || text.isBlank() || text.stripLeading().startsWith("<")) {
            return ALLOW_ALL; // empty, or an HTML page served in its place: no rules
        }
        String token = agentToken.toLowerCase(Locale.ROOT);
        List<Rule> ours = new ArrayList<>();
        List<Rule> star = new ArrayList<>();
        boolean sawOurs = false;
        List<String> agents = new ArrayList<>();
        boolean inRules = false;
        List<Rule> current = new ArrayList<>();
        for (String raw : text.split("\\r?\\n")) {
            String line = raw.replaceFirst("#.*$", "").trim();
            int colon = line.indexOf(':');
            if (colon < 0) {
                continue;
            }
            String field = line.substring(0, colon).trim().toLowerCase(Locale.ROOT);
            String value = line.substring(colon + 1).trim();
            if (field.equals("user-agent")) {
                if (inRules) { // a new group starts
                    assign(agents, current, token, ours, star);
                    sawOurs |= agents.stream().anyMatch(a -> !a.equals("*") && token.contains(a));
                    agents = new ArrayList<>();
                    current = new ArrayList<>();
                    inRules = false;
                }
                agents.add(value.toLowerCase(Locale.ROOT));
            } else if (field.equals("allow") || field.equals("disallow")) {
                inRules = true;
                if (!value.isEmpty()) {
                    current.add(new Rule(field.equals("allow"), value, toPattern(value)));
                }
            }
        }
        assign(agents, current, token, ours, star);
        sawOurs |= agents.stream().anyMatch(a -> !a.equals("*") && token.contains(a));
        return new RobotsRules(sawOurs ? ours : star);
    }

    private static void assign(List<String> agents, List<Rule> rules, String token, List<Rule> ours, List<Rule> star) {
        for (String a : agents) {
            if (a.equals("*")) {
                star.addAll(rules);
            } else if (!a.isEmpty() && token.contains(a)) {
                ours.addAll(rules);
            }
        }
    }

    private static Pattern toPattern(String path) {
        StringBuilder re = new StringBuilder("^");
        boolean end = path.endsWith("$");
        String p = end ? path.substring(0, path.length() - 1) : path;
        for (String part : p.split("\\*", -1)) {
            if (re.length() > 1) {
                re.append(".*");
            }
            re.append(Pattern.quote(part));
        }
        if (end) {
            re.append('$');
        }
        return Pattern.compile(re.toString());
    }

    /** @param pathAndQuery the raw path, with "?query" when there is one */
    public boolean allows(String pathAndQuery) {
        String target = pathAndQuery == null || pathAndQuery.isEmpty() ? "/" : pathAndQuery;
        Rule best = null;
        for (Rule r : rules) {
            if (r.pattern().matcher(target).find()) {
                if (best == null || r.path().length() > best.path().length()
                        || (r.path().length() == best.path().length() && r.allow())) {
                    best = r;
                }
            }
        }
        return best == null || best.allow();
    }
}
