# Test Case Review — EngageLens

**Reviewed artifact:** [engagelens-test-plan.md](engagelens-test-plan.md)  
**Against:** [engagelens-prd.md](engagelens-prd.md), architecture doc, current `extension/` (side panel UI)  
**Method:** test-case-reviewer skill

---

### 1. Review Conclusion

The plan’s **unit layer (U1–U11)** is solid and should be automated immediately. Integration (I1–I7) and manual (M1–M20) layers are directionally right but **out of date vs the shipped UI** (side panel + FAB, not an inline under-post panel). Several cases have weak expected results (“decide and test”), missing negative paths for side-panel messaging, and no explicit cooldown / `OPEN_SIDEPANEL` coverage. Treat the unit suite as the regression gate; keep manual cases as a living checklist after LinkedIn redesigns.

---

### 2. High-Priority Findings

1. **UI architecture mismatch (M9, M15, M16, §6 regression)**  
   Cases still assume an inline panel “under the post” with Close (X) and multi-panel behavior. Product is `chrome.sidePanel` + FAB. These cases will fail or confuse testers and miss real bugs (auto-fill race, pending post text, settings gear → popup window).

2. **U2 (triple-quote in post text) is unimplemented risk**  
   Current `buildPrompt()` wraps the post in `"""…"""`. A post containing `"""` can confuse the model / delimiter. This case must fail red until production escapes or switches delimiter — highest-value unit fix.

3. **I1 message path is wrong for current design**  
   Content script sends `OPEN_SIDEPANEL`, not `GENERATE_COMMENT`. Generation is sidepanel → background. I1 as written won’t catch regressions in the real flow.

4. **Missing side-panel / FAB cases**  
   No cases for: FAB opens empty panel; per-post icon auto-fills textarea + char counter; storage `pendingPostText` race when panel cold-starts; settings gear opens settings UI; 3s generate cooldown.

5. **Weak / non-executable expectations**  
   M6, M8, M16 say “decide intended behavior.” Without a locked expected result they are not test cases — they are open questions. Lock them before the edge-case pass.

6. **I6 double-click vs product cooldown**  
   Product enforces a client cooldown in the side panel. I6 should assert cooldown/ignore behavior explicitly, not “either/or.”

---

### 3. Other Issues

- **M12 / I3 overlap** — both cover missing API key; keep I3 for structured error code (`NO_API_KEY`) and M12 for banner UX.
- **No priority field** (P0/P1) on cases — hard to know what blocks “v1 done.”
- **No preconditions / steps** on most rows — fine for unit IDs, weak for manual execution by someone else.
- **Tone mapping U9** — UI labels (Professional…) differ from prompt tokens (`insightful`). Tests must assert **prompt token**, not chip label, or document the mapping.
- **Sponsored posts (M8)** — still undecided; default recommendation: **include** (same as normal posts) to minimize selector special-casing.
- **§5 checklist** duplicates M/I cases without IDs — harder to trace pass/fail.

---

### 4. Missing Scenarios

| ID | Scenario | Why it matters |
|---|---|---|
| I8 | Content → background `OPEN_SIDEPANEL` with `postText` | Core UX path; I1 currently wrong |
| I9 | FAB `OPEN_SIDEPANEL` with null/empty postText clears pending text | Avoids stale auto-fill |
| I10 | Sidepanel reads `pendingPostText` on load and via `storage.onChanged` | Cold-start race |
| M21 | FAB visible on feed; opens side panel | Reference UI requirement |
| M22 | Per-post icon auto-fills textarea + updates `N / 10,000` | Main happy path |
| M23 | Generate cooldown (~3s) shows wait message | Prevents spam / bot-like pace |
| M24 | Sidepanel settings gear opens settings | Settings discovery without toolbar |
| U12 | `null` / `undefined` postText to `truncateAtSentence` / `buildPrompt` | Defensive; content may pass empty |
| U13 | Instruction with only whitespace treated as empty | Avoid `"   "` in prompt |

---

### 5. Recommended Fix Order

1. **Lock product decisions** for M6 (quote+original), M8 (sponsored = include), M16 (single side panel only).
2. **Rewrite manual M9/M15/M16** for side panel; add M21–M24.
3. **Rewrite I1 → I8/I9/I10**; tighten I6 to cooldown.
4. **Automate U1–U11 (+U12/U13)** with `node --test` (TDD; fix U2 in production).
5. **Mock-fetch integration harness** for I2–I5 later (optional for personal v1).
6. Keep §5/§6 as periodic regression after LinkedIn UI changes.

---

### 6. Residual Risks

- LinkedIn DOM selector breakage cannot be fully automated cheaply (plan §7 is correct).
- OpenRouter free-tier flakiness will cause false negatives on live I2/I5.
- Side-panel `open()` user-gesture timing is browser-dependent — needs manual verification on Chrome stable.
- No cross-tab isolation automated test; multi-tab remains manual-only residual risk.

---

*Improved executable case pack: [engagelens-test-cases.md](engagelens-test-cases.md)*  
*Automated unit tests: `extension/test/prompt.test.js`*
