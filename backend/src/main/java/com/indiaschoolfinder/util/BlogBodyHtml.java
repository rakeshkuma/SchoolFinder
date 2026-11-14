package com.indiaschoolfinder.util;

import org.springframework.web.util.HtmlUtils;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * A blog article's body as plain HTML for the server-rendered page, read exactly as the app reads it
 * (frontend/src/utils/blogBody.ts): ## and ### headings, - and 1. lists, **bold**, [links](url), | tables | and > notes.
 * Every piece of text is escaped, and a link is kept only for http(s) or a path on this site, so nothing in an article
 * can run as HTML.
 */
public final class BlogBodyHtml {

    private static final Pattern HEADING = Pattern.compile("^(#{2,3})\\s+(.+)$");
    private static final Pattern BULLET = Pattern.compile("^[-*]\\s+(.+)$");
    private static final Pattern NUMBERED = Pattern.compile("^\\d+\\.\\s+(.+)$");
    private static final Pattern CELLS = Pattern.compile("^\\|(.+)\\|$");
    private static final Pattern NOTE = Pattern.compile("^>\\s?(.*)$");
    private static final Pattern RULE = Pattern.compile("^:?-{3,}:?$");
    private static final Pattern INLINE = Pattern.compile("\\*\\*(.+?)\\*\\*|\\[([^\\]]+)\\]\\(([^)\\s]+)\\)");

    private BlogBodyHtml() {
    }

    private sealed interface Block permits Heading, Paragraph, ListBlock, Table, Note {
    }

    private record Heading(int level, String text, String id) implements Block {
    }

    private record Paragraph(String text) implements Block {
    }

    private record ListBlock(boolean ordered, List<String> items) implements Block {
    }

    private record Table(List<String> head, List<List<String>> rows) implements Block {
    }

    private static final class Note implements Block {
        private final StringBuilder text;

        Note(String text) {
            this.text = new StringBuilder(text);
        }
    }

    public static String render(String body) {
        StringBuilder html = new StringBuilder();
        for (Block b : parse(body == null ? "" : body)) {
            switch (b) {
                case Heading h -> html.append("<h").append(h.level()).append(" id=\"").append(h.id()).append("\">")
                        .append(inline(h.text())).append("</h").append(h.level()).append('>');
                case Paragraph p -> html.append("<p>").append(inline(p.text())).append("</p>");
                case ListBlock l -> {
                    String tag = l.ordered() ? "ol" : "ul";
                    html.append('<').append(tag).append('>');
                    l.items().forEach(i -> html.append("<li>").append(inline(i)).append("</li>"));
                    html.append("</").append(tag).append('>');
                }
                case Table t -> {
                    html.append("<table><thead><tr>");
                    t.head().forEach(c -> html.append("<th>").append(inline(c)).append("</th>"));
                    html.append("</tr></thead><tbody>");
                    for (List<String> row : t.rows()) {
                        html.append("<tr>");
                        row.forEach(c -> html.append("<td>").append(inline(c)).append("</td>"));
                        html.append("</tr>");
                    }
                    html.append("</tbody></table>");
                }
                case Note n -> html.append("<p class=\"pr-note\">").append(inline(n.text.toString())).append("</p>");
            }
        }
        return html.toString();
    }

    private static List<Block> parse(String body) {
        List<Block> blocks = new ArrayList<>();
        Map<String, Integer> used = new HashMap<>();
        List<String> paragraph = new ArrayList<>();
        Runnable flush = () -> {
            if (!paragraph.isEmpty()) {
                blocks.add(new Paragraph(String.join(" ", paragraph)));
                paragraph.clear();
            }
        };
        for (String raw : body.replace("\r\n", "\n").split("\n", -1)) {
            String line = raw.trim();
            Matcher heading = HEADING.matcher(line), bullet = BULLET.matcher(line), numbered = NUMBERED.matcher(line);
            Matcher cells = CELLS.matcher(line), note = NOTE.matcher(line);
            Block last = blocks.isEmpty() ? null : blocks.get(blocks.size() - 1);
            if (cells.matches()) {
                flush.run();
                List<String> row = new ArrayList<>();
                for (String c : cells.group(1).split("\\|", -1)) row.add(c.trim());
                if (row.stream().allMatch(c -> RULE.matcher(c).matches())) continue; // the | --- | line under the header
                if (last instanceof Table t) t.rows().add(row);
                else blocks.add(new Table(row, new ArrayList<>()));
            } else if (note.matches()) {
                flush.run();
                if (last instanceof Note n) n.text.append(' ').append(note.group(1));
                else blocks.add(new Note(note.group(1)));
            } else if (line.isEmpty()) {
                flush.run();
            } else if (heading.matches()) {
                flush.run();
                blocks.add(new Heading(heading.group(1).length(), heading.group(2), headingId(heading.group(2), used)));
            } else if (bullet.matches() || numbered.matches()) {
                flush.run();
                boolean ordered = !bullet.matches();
                String item = ordered ? numbered.group(1) : bullet.group(1);
                if (last instanceof ListBlock l && l.ordered() == ordered) l.items().add(item);
                else blocks.add(new ListBlock(ordered, new ArrayList<>(List.of(item))));
            } else {
                paragraph.add(line);
            }
        }
        flush.run();
        return blocks;
    }

    /** The same heading ids as the app, so links to a section (#fees) work in both. */
    private static String headingId(String text, Map<String, Integer> used) {
        String base = text.toLowerCase(java.util.Locale.ROOT).replaceAll("[^a-z0-9]+", "-").replaceAll("^-|-$", "");
        if (base.isEmpty()) base = "section";
        int n = used.merge(base, 1, Integer::sum);
        return n == 1 ? base : base + "-" + n;
    }

    static String inline(String text) {
        StringBuilder out = new StringBuilder();
        Matcher m = INLINE.matcher(text);
        int at = 0;
        while (m.find()) {
            out.append(esc(text.substring(at, m.start())));
            if (m.group(1) != null) {
                out.append("<strong>").append(esc(m.group(1))).append("</strong>");
            } else if (safeHref(m.group(3))) {
                boolean external = !m.group(3).startsWith("/");
                out.append("<a href=\"").append(esc(m.group(3))).append('"').append(external ? " rel=\"noopener\"" : "").append('>')
                        .append(esc(m.group(2))).append("</a>");
            } else {
                out.append(esc(m.group(2)));
            }
            at = m.end();
        }
        return out.append(esc(text.substring(at))).toString();
    }

    private static boolean safeHref(String href) {
        return href.matches("(?i)^https?://.*") || (href.startsWith("/") && !href.startsWith("//"));
    }

    private static String esc(String s) {
        return HtmlUtils.htmlEscape(s, "UTF-8");
    }
}
