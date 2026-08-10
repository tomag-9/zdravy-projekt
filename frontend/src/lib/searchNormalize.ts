/**
 * Normalizes a string for free-text search matching: case, diacritics,
 * punctuation and whitespace differences must not affect whether a query
 * matches a name. Used to normalize both the search term and the searched
 * fields the same way — never to change what's displayed/stored.
 */
export function normalizeForSearch(value: string): string {
  return value
    .normalize("NFKD")
    // Strip combining diacritical marks left behind by NFKD decomposition
    // (e.g. "Ž" -> "Z" + combining caron).
    .replace(/[̀-ͯ]/g, "")
    // Strip anything that isn't a letter, digit or whitespace (punctuation).
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}
