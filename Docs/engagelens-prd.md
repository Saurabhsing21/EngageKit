# PRD — EngageLens
*(AI-assisted LinkedIn comment drafting, personal-use Chrome extension)*

## 1. Summary
A Chrome extension that adds a small icon to LinkedIn feed posts. Clicking it sends the post's visible text to an LLM (via OpenRouter) and returns a draft comment, tuned by tone/length/custom instruction. The user reviews, edits, and manually pastes it into LinkedIn's own comment box — no auto-posting.

## 2. Problem Statement
Writing a genuine, non-generic comment on every post worth engaging with takes real time and mental effort. Most people either skip commenting (losing visibility/networking value) or default to low-effort "Great post!" replies. This is especially relevant while job-hunting — commenting thoughtfully on founder/startup posts is a known outreach tactic, but doing it consistently is the bottleneck, not the idea.

## 3. Goals
- Cut the time to write a solid, non-generic comment from ~2-3 minutes to ~15-20 seconds
- Keep the final comment in the user's own voice — AI drafts, human edits and approves
- Zero cost to near-zero cost per use (free/cheap OpenRouter models)
- Stay in the lowest-risk usage pattern relative to LinkedIn's policy (see architecture doc §11)

## 4. Non-Goals (explicitly out of scope for v1)
- No auto-posting or auto-clicking LinkedIn UI on the user's behalf
- No bulk/background processing of the whole feed
- No scraping or storing of other people's profile/post data beyond the single post being acted on, and only in-memory for that request
- No multi-user support, accounts, or billing — this is a personal tool, not a product
- No publishing to the Chrome Web Store in v1

## 5. Target User
Just the builder (Saurabh) — final-year CS student, using this personally to engage with startup founder posts as part of job search, and as a portfolio artifact demonstrating a working AI-integrated Chrome extension.

## 6. Core User Stories
1. As a user scrolling my feed, I want to click one icon on a post and get a comment draft, so I don't have to think from scratch.
2. As a user, I want to pick a tone (insightful, curious, supportive, witty, contrarian) so the comment matches how I actually want to sound on that post.
3. As a user, I want to add a one-off instruction ("mention I'm a final-year CS student") so the comment can be steered for outreach purposes.
4. As a user, I want to regenerate if the first draft isn't good, without re-typing everything.
5. As a user, I want my OpenRouter API key and settings saved locally so I don't re-enter them every session.
6. As a user, I want to copy the final comment with one click and paste it myself — I stay in control of what actually gets posted.

## 7. Feature List

**P0 — MVP (build first)**
- Icon injection on feed posts (single post at a time, manual trigger)
- Post text extraction (post body only)
- Inline panel: tone dropdown, length toggle, custom instruction field, Generate button
- OpenRouter API call via background service worker
- Result display + Copy button
- Settings popup: API key, default model, default tone

**P1 — Fast follow (once MVP works end-to-end)**
- Regenerate button (new variant, same inputs)
- Error/empty-state handling (no key set, API failure, unreadable post type)
- Loading state polish

**P2 — Nice-to-have / stretch (see architecture doc §12 for the full list of ideas)**
- Multiple comment variants per generation (pick from 2-3)
- Local "tone profile" learned from a few of the user's own past comments (manually pasted in once, used as few-shot examples)
- Keyboard shortcut to trigger the panel instead of clicking the icon
- Local-only usage log (comments generated, tones used) for the user's own reflection — never uploaded anywhere

## 8. Success Criteria (personal-use tool, so informal)
- Extension reliably injects the icon on real feed posts without breaking as LinkedIn's DOM changes over normal use
- Comment quality is good enough that the user posts the AI draft with light or no editing most of the time
- Cost stays near-zero (free/cheap OpenRouter models sufficient for quality bar)
- No account restriction/warning from LinkedIn during personal use

## 9. Constraints
- OpenRouter free-tier models may be slower/rate-limited — cheap paid model (e.g. Gemini Flash) as fallback, budget-conscious
- LinkedIn's DOM structure can change without notice — selectors need to be resilient/easy to patch, not deeply hardcoded
- No backend — all logic client-side in the extension; API key lives only in local extension storage

## 10. Risks
- **LinkedIn policy risk** — covered in architecture doc §11; mitigated by manual-trigger-only, no auto-posting, no bulk actions, unpublished/unlisted install
- **DOM breakage risk** — LinkedIn feed markup changes over time; mitigate by keeping selector logic isolated in one small module so it's a quick fix, not a rewrite
- **LLM quality risk** — cheap/free models may need prompt-tuning to avoid generic output; budget iteration time on the prompt template, not just the code

## 11. Milestones
Same as architecture doc's Build Order: (1) icon injection, (2) settings/API key, (3) OpenRouter call, (4) wire click → panel → result, (5) full inline panel UI, (6) polish/error states.
