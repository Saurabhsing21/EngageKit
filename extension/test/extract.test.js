/**
 * Unit tests for extract helpers (text clean + merge).
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { cleanPostText, mergePostChunks } = require('../lib/extract.js');

describe('extract helpers', () => {
  it('cleanPostText collapses whitespace and trims', () => {
    assert.equal(cleanPostText('  hello\n\nworld  '), 'hello world');
  });

  it('cleanPostText handles nullish', () => {
    assert.equal(cleanPostText(null), '');
    assert.equal(cleanPostText(undefined), '');
  });

  it('mergePostChunks prefers longest and drops substrings', () => {
    const merged = mergePostChunks([
      'Short',
      'Short but longer quote about shipping.',
      'Short but longer quote about shipping. Plus original thoughts.'
    ]);
    assert.equal(
      merged,
      'Short but longer quote about shipping. Plus original thoughts.'
    );
  });

  it('mergePostChunks joins distinct quote + original', () => {
    const merged = mergePostChunks([
      'My take on the launch.',
      'Original post about Claude and ChatGPT competing hard.'
    ]);
    assert.ok(merged.includes('My take on the launch.'));
    assert.ok(merged.includes('Original post about Claude'));
    assert.ok(merged.includes('\n\n'));
  });
});
