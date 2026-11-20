package com.indiaschoolfinder.notifications.source;

/**
 * A group of official websites built the same way (each Kendriya Vidyalaya's own site on the government platform), read
 * with one reviewed template. Each site is its own source, with its own school and health; the family is how they are
 * read side by side and shown to staff as one line.
 *
 * @param key   short name, the prefix of its members' keys ("kv" → "kv-mankhurd")
 * @param name  what staff see ("Kendriya Vidyalaya websites")
 * @param sites how many sites the family lists
 */
public record SourceFamily(String key, String name, int sites) {
}
