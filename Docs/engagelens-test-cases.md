# EngageLens — Executable Test Cases (v1)

Revised from [engagelens-test-plan.md](engagelens-test-plan.md) after [engagelens-test-case-review.md](engagelens-test-case-review.md).  
Aligned with **side panel + FAB** implementation in `extension/`.

**Priorities:** P0 = blocks v1 done · P1 = should pass before daily use · P2 = nice / periodic

**Locked product decisions**
- **M6:** Extract combined visible commentary text from the post card (quote + original when both appear in the body node). Do not invent separate labeling in v1.
- **M8:** Sponsored posts — **include** (same injection rules as organic).
- **M16:** Only **one** side panel (Chrome side panel); switching posts replaces textarea content.

---

## A. Unit cases (automated — `npm test` in `extension/`)

| ID | Priority | Case | Steps / input | Expected |
|---|---|---|---|---|
| U1 | P0 | Normal `buildPrompt` | post with normal text; tone=`insightful`; length=`medium`; instruction empty | Prompt contains post text, `insightful`, `medium`, same-language rule; no `{{` / `}}` leftovers |
| U2 | P0 | Post contains `"""` | postText includes triple quotes | Prompt remains well-delimited; post body preserved; no broken fence |
| U3 | P0 | Empty instruction | `instruction: ''` or omitted | No literal `undefined`; instruction shown as `(none)` or omitted cleanly |
| U4 | P0 | Long post 3000+ chars | 3000-char multi-sentence post | Inserted text ≤ `llmMaxChars` (2000); ends at sentence boundary when possible |
| U5 | P0 | Non-English post | Hindi/French sample | Prompt still includes “same language as the post” |
| U6 | P0 | Truncate under limit | len < max | Unchanged (trimmed) |
| U7 | P0 | Truncate mid-sentence | over limit, cutoff mid-sentence | Backs up to last `. ` / `! ` / `? ` (or equivalent), not mid-word when sentence found |
| U8 | P0 | No punctuation run-on | long string, no `.?!` | Hard cutoff or last-space fallback; no throw |
| U9 | P0 | All 5 tones | each tone id | Distinct non-empty token appears in prompt; never `undefined` |
| U10 | P0 | All 3 lengths | short/medium/long | Distinct non-empty token in prompt |
| U11 | P0 | Unknown tone/length | `tone: undefined`, `length: null` | Defaults to `insightful` / `medium` |
| U12 | P1 | Nullish postText | `null` / `undefined` | Truncate/build do not throw; empty or safe string |
| U13 | P1 | Whitespace-only instruction | `'   '` | Treated as empty → `(none)` |

---

## B. Integration cases (manual + mock fetch later)

| ID | Priority | Case | Expected |
|---|---|---|---|
| I2 | P0 | Valid OpenRouter key generate | Sidepanel receives `{ comment }` string |
| I3 | P0 | Missing/invalid key | Structured error (`NO_API_KEY` or invalid-key message); message channel stays open |
| I4 | P0 | Non-200 OpenRouter | Error string includes status; UI shows Retry |
| I5 | P0 | Slow response >15s | Timeout message; no infinite spinner |
| I6 | P0 | Double Generate within 3s | Second blocked with wait message; no dual overwrite race |
| I7 | P1 | Change default model in popup | Next generate uses new model without reloading LinkedIn |
| I8 | P0 | Post icon → `OPEN_SIDEPANEL` + postText | Side panel opens; textarea auto-filled |
| I9 | P0 | FAB → `OPEN_SIDEPANEL` without text | Panel opens; no stale pending text |
| I10 | P1 | Panel cold-start with pendingPostText | Text appears via load consume or storage event |

*(Legacy I1 replaced by I8.)*

---

## C. Manual / exploratory (live LinkedIn feed)

### Injection

| ID | Priority | Case | Expected |
|---|---|---|---|
| M1 | P0 | Fresh feed, slow scroll | Engage control once per text post |
| M2 | P0 | Scroll away and back | No duplicate; still present |
| M3 | P1 | Aggressive scroll | No dupes / console errors |
| M4 | P1 | Poll post | Unsupported toast **or** readable question text only — no crash |
| M5 | P0 | Image-only, no caption | Toast: can't read / no crash |
| M6 | P1 | Quote repost | Icon works; extracted text includes visible quote+original body |
| M7 | P0 | “…see more” long post | Extracted text is full DOM text, not clipped visual only |
| M8 | P2 | Sponsored post | Icon injects like organic |

### Side panel + generation

| ID | Priority | Case | Expected |
|---|---|---|---|
| M9 | P0 | Click post Engage | Side panel opens (right); post text filled |
| M10 | P0 | Change style/length then Generate | Output matches selected style/length |
| M11 | P0 | Custom instruction | Instruction reflected in comment |
| M12 | P0 | Generate with no API key | Banner + clear error; no silent fail |
| M13 | P0 | Regenerate | New variant (not identical preferred; at least new request completes) |
| M14 | P0 | Copy → paste into LinkedIn comment box | Clipboard matches draft |
| M15 | P1 | Close side panel, reopen via FAB | Clean state or prior draft acceptable; no crash |
| M16 | P0 | Post A then Post B icon | Textarea replaced with Post B text |
| M21 | P0 | FAB on feed | Visible bottom-right; opens empty/editable panel |
| M22 | P0 | Auto-fill char counter | Counter updates with filled length / 10,000 |
| M23 | P1 | Generate cooldown | Wait message if < ~3s apart |
| M24 | P1 | Settings gear in panel footer | Opens settings UI |

### Settings popup

| ID | Priority | Case | Expected |
|---|---|---|---|
| M17 | P0 | Valid key + Test Connection | Success status |
| M18 | P0 | Invalid key + Test Connection | Failure message; popup alive |
| M19 | P0 | Change model/tone, reopen | Persisted |
| M20 | P0 | Fresh install | Empty key state; no throw |

---

## D. Edge-case pass (P0 before “v1 done”)

Map to IDs above where possible; check remaining:

- [ ] Image/video-only → M5
- [ ] Poll → M4
- [ ] Carousel/PDF → graceful (toast or weak extract, no crash) — **M25** ad-hoc
- [ ] 3000+ chars → U4 + live generate
- [ ] Non-English → U5 + live spot-check
- [ ] Scroll re-render → M2/M3
- [ ] Multi-tab LinkedIn → no cross-tab API key leak / no crash
- [ ] Rate limit → clear message, no retry loop
- [ ] Empty model output → regenerate guidance
- [ ] Offline → clean error
- [ ] Invalid key caught in Test Connection → M18
- [ ] Reload mid-generate → next click works
- [ ] Logged out → injection stops without console spam

---

## E. Regression (after LinkedIn redesign)

- [ ] Icon injects on text posts
- [ ] Action-bar placement OK (`selectors.js`)
- [ ] Body extract ≠ author/ads/comments
- [ ] Side panel open + auto-fill works
- [ ] Generate → copy → paste works

---

## How to run automated unit tests

```bash
cd extension
npm test
```
