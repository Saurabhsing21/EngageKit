# Test Plan — EngageLens

> **Updated artifacts:** Reviewed findings → [engagelens-test-case-review.md](engagelens-test-case-review.md) · Executable cases (side-panel aligned) → [engagelens-test-cases.md](engagelens-test-cases.md) · Automated unit tests → `extension/test/prompt.test.js` (`cd extension && npm test`)

## 1. Testing Strategy Overview

This is a personal-use browser extension with no backend, so the test approach is layered but lightweight:

| Layer | What it covers | How |
|---|---|---|
| Unit tests | Pure logic — prompt building, text truncation, tone/length mapping | Plain JS test file (e.g. with `node --test` or a tiny test runner), no browser needed |
| Integration tests | content.js ⇄ background.js messaging, background.js ⇄ OpenRouter call | Manual + a mock fetch for the API call, run inside the extension |
| Manual/exploratory | Real LinkedIn feed behavior, DOM injection, visual UI | Load unpacked extension, test against live linkedin.com/feed |
| Edge case pass | Everything in architecture doc §12 | Manual, checklist-driven, one pass before considering v1 "done" |

Given the LinkedIn DOM can change without notice, treat this less like "test once and ship" and more like "keep this checklist and re-run it periodically" — especially after LinkedIn does a visible feed redesign.

---

## 2. Unit Test Cases (pure logic, no browser needed)

### `buildPrompt()`
| # | Case | Expected |
|---|---|---|
| U1 | Normal post text, tone=insightful, length=medium, no instruction | Returns prompt string with post text embedded, correct tone/length phrases, no leftover `{{}}` placeholders |
| U2 | Post text contains triple-quote characters (`"""`) | Prompt doesn't break/truncate — escape or use a different delimiter |
| U3 | Empty custom instruction | Instruction line omitted or gracefully blank, not `"undefined"` in the output string |
| U4 | Very long post text (3000+ chars) | Text is truncated before insertion, truncation happens at a sentence boundary |
| U5 | Post text in a non-English language | Prompt still includes the "reply in the same language" instruction |

### Text truncation helper
| # | Case | Expected |
|---|---|---|
| U6 | Text under limit | Returned unchanged |
| U7 | Text over limit, ends mid-sentence at cutoff | Truncates back to the last full sentence, not mid-word |
| U8 | Text with no sentence-ending punctuation at all (e.g. one long run-on) | Falls back to a hard character cutoff without crashing |

### Tone/length → prompt-phrase mapping
| # | Case | Expected |
|---|---|---|
| U9 | Each of the 5 tone options | Each maps to a distinct, non-empty phrase |
| U10 | Each of the 3 length options | Each maps to a distinct, non-empty phrase |
| U11 | Unknown/unset tone or length (shouldn't happen via UI, but defensive) | Falls back to a sensible default instead of inserting `undefined` |

---

## 3. Integration Test Cases (extension-internal, message passing + API)

| # | Case | Expected |
|---|---|---|
| I1 | content.js sends `GENERATE_COMMENT` message → background.js | background.js receives full payload (postText, tone, length, instruction, model) |
| I2 | background.js calls OpenRouter with valid key | Returns parsed comment text back through `sendResponse` |
| I3 | background.js calls OpenRouter with invalid/missing key | Returns a structured error object, not a thrown exception that breaks the message channel |
| I4 | OpenRouter returns non-200 status | Error surfaces to content script with the status code, not a silent failure |
| I5 | OpenRouter response is slow (>15s) | Timeout fires, panel shows a timeout message instead of an infinite spinner |
| I6 | Two generate requests fired in quick succession (double-click) | Either the second is ignored while one is in-flight, or both resolve correctly — no race condition overwriting the wrong panel |
| I7 | Settings changed in popup (new default model) mid-session | Next generation request uses the new default without needing a page reload |

---

## 4. Manual / Exploratory Test Cases (real LinkedIn, live feed)

### Icon injection
| # | Case | Expected |
|---|---|---|
| M1 | Load feed fresh, scroll down slowly | Icon appears on every text-bearing post exactly once |
| M2 | Scroll past a post, scroll back up to it | Icon still present, not duplicated, not missing |
| M3 | Fast/aggressive scrolling (mouse wheel spam) | No duplicate icons, no missing icons, no console errors |
| M4 | Post with an embedded poll | Icon either doesn't appear or panel gracefully says "unsupported" |
| M5 | Post with only an image, no caption text | Same as above |
| M6 | Reposted/shared post with a quote comment | Icon appears; verify what text actually gets extracted (both original + quote, or just one — confirm it matches the intended design) |
| M7 | Very long post with "...see more" truncation | Extracted text is the full post, not just the visually truncated portion |
| M8 | Sponsored/promoted post | Confirm behavior is intentional (include or exclude — decide and test accordingly) |

### Panel + generation flow
| # | Case | Expected |
|---|---|---|
| M9 | Click icon → panel opens | Positioned sensibly under the post, not overlapping other UI, not cut off at screen edge |
| M10 | Change tone/length after panel is open, then generate | Correct values are used, not stale defaults |
| M11 | Type a custom instruction, generate | Instruction visibly reflected in output |
| M12 | Click Generate with no API key set | Clear message pointing to settings, no silent failure |
| M13 | Click Regenerate | New variant produced, doesn't just repeat the same text |
| M14 | Click Copy | Comment text copied to clipboard correctly (test paste into LinkedIn's actual comment box) |
| M15 | Close panel (X), reopen on same post | Panel resets cleanly, no leftover state from the last generation |
| M16 | Open panel on Post A, then click icon on Post B without closing Post A's panel | Decide intended behavior (only one panel open at a time vs. multiple) and verify it matches |

### Settings / popup
| # | Case | Expected |
|---|---|---|
| M17 | Enter valid API key, hit Test Connection | Success confirmation |
| M18 | Enter invalid API key, hit Test Connection | Clear failure message, doesn't crash popup |
| M19 | Change default model/tone, close popup, reopen | Values persisted correctly |
| M20 | Fresh install, no settings saved yet | Popup shows sensible empty state, doesn't error |

---

## 5. Edge Case Test Pass (from architecture doc §12 — run this checklist before calling v1 "done")

- [ ] Image-only / video-only post → handled gracefully
- [ ] Poll post → handled gracefully
- [ ] Carousel/document (PDF slide) post → handled gracefully
- [ ] Post over ~3000 characters → truncates correctly, doesn't error
- [ ] Non-English post → replies in matching language
- [ ] Already-commented post → no crash, optional visual flag works if implemented
- [ ] Scroll-triggered re-render doesn't duplicate/lose icons
- [ ] Multiple LinkedIn tabs open simultaneously → no cross-tab interference
- [ ] OpenRouter rate limit response → clear message, no silent retry loop
- [ ] Model returns empty/very short output → regenerate prompt shown, not a blank panel
- [ ] Network offline → clean error, no infinite spinner
- [ ] Invalid/expired API key → caught by Test Connection, not mid-scroll
- [ ] Extension reloaded/updated mid-generation → no orphaned state, next click works cleanly
- [ ] Logged out of LinkedIn mid-session → icon injection stops, no console spam

---

## 6. Regression Checklist (run periodically, especially after a visible LinkedIn feed redesign)

- [ ] Icon still injects on standard text posts
- [ ] Action-bar selector still matches (icon placement didn't break)
- [ ] Post-body text selector still extracts the right content (not author name, not ads, not comments)
- [ ] Panel still positions correctly under posts
- [ ] End-to-end generate → copy → paste still works

Keep all selectors isolated in one `selectors.js`-style module (per architecture doc) specifically so this checklist is fast to re-run and fix.

---

## 7. Out of Scope for Testing (v1)
- Load/performance testing (single personal user, not a concern)
- Cross-browser testing (Chrome/Chromium only, per architecture)
- Automated end-to-end browser testing (Puppeteer/Playwright against live LinkedIn) — likely more effort than it's worth for a personal tool where manual testing is fast and LinkedIn's DOM changes would break automated selectors just as easily as the extension itself
