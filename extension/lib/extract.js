/**
 * Pure text helpers for post extraction (Node-testable).
 * Used by selectors.js via shared logic pattern — keep in sync with cleanPostText there.
 */

function cleanPostText(raw) {
  if (!raw) return '';
  return String(raw)
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^\s*hashtag\s+/gi, '')
    .trim();
}

/**
 * Merge unique post text chunks (longest first), dropping substrings.
 */
function mergePostChunks(chunks) {
  const cleaned = (chunks || [])
    .map(cleanPostText)
    .filter((t) => t.length >= 1);

  const unique = [];
  for (const text of cleaned) {
    let skip = false;
    for (let i = unique.length - 1; i >= 0; i--) {
      const existing = unique[i];
      if (existing.includes(text) && existing.length >= text.length) {
        skip = true;
        break;
      }
      if (text.includes(existing) && text.length > existing.length) {
        unique.splice(i, 1);
      }
    }
    if (!skip) unique.push(text);
  }

  unique.sort((a, b) => b.length - a.length);
  if (!unique.length) return '';
  const primary = unique[0];
  const extras = unique.slice(1).filter((c) => !primary.includes(c));
  return [primary, ...extras].join('\n\n').trim();
}

globalThis.cleanPostText = cleanPostText;
globalThis.mergePostChunks = mergePostChunks;

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { cleanPostText, mergePostChunks };
}
