# LinkedIn Engagement Extension — Architecture (v1, personal use)

## 1. System Overview

No backend server. The extension talks directly to OpenRouter using your own API key stored on your machine. Three moving parts:

```
┌─────────────────┐      ┌──────────────────────┐      ┌────────────────┐
│  content.js       │ ⇄  │  background.js         │ ⇄  │  OpenRouter API  │
│  (runs on         │      │  (service worker,       │      │  (chat/completions│
│  linkedin.com)     │      │  holds API key,          │      │  endpoint)         │
└─────────────────┘      │  makes fetch calls)     │      └────────────────┘
        ▲                    └──────────────────────┘
        │                             ▲
        ▼                             │
┌─────────────────┐      ┌──────────────────────┐
│  inline-ui.js       │      │  popup.html/js          │
│  (panel injected    │      │  (settings: API key,     │
│  under each post)   │      │  model, default tone)    │
└─────────────────┘      └──────────────────────┘
```

Nothing auto-posts. You always copy the generated comment and paste it into LinkedIn's own comment box yourself.

---

## 2. Component 1 — `manifest.json`

```json
{
  "manifest_version": 3,
  "name": "LinkedIn Engage Assist",
  "version": "0.1.0",
  "permissions": ["storage"],
  "host_permissions": [
    "https://www.linkedin.com/*",
    "https://openrouter.ai/*"
  ],
  "background": { "service_worker": "background.js" },
  "content_scripts": [
    {
      "matches": ["https://www.linkedin.com/feed*"],
      "js": ["content.js"],
      "css": ["inline-ui.css"]
    }
  ],
  "action": { "default_popup": "popup.html" },
  "icons": { "128": "icon128.png" }
}
```

Notes:
- `host_permissions` for `openrouter.ai` is what lets `background.js` call the API without CORS issues.
- Kept to `feed*` match — expand later to `/posts/`, single-post pages, if needed.
- No `scripting` or `webRequest` permission needed for v1 — keeps the permission prompt minimal (important, fewer scary permissions = less risk of accidentally tripping something).

---

## 3. Component 2 — `content.js` (post detection + text extraction)

**Job:** find posts in the feed, inject an icon, extract the post text when clicked.

Key design decisions:
- LinkedIn's feed is a virtualized/infinite-scroll SPA — posts mount and unmount as you scroll. Use a `MutationObserver` on the feed container (not `setInterval` polling — wasteful and flaky).
- Each post card has a stable-ish structural pattern (article/div wrapper with a text block + action bar). Target the action bar (Like/Comment/Repost row) and inject your icon as a new button there — visually consistent with LinkedIn's own UI.
- Text extraction: grab `.innerText` of the post body node specifically (not the whole card — avoid pulling in author name/headline/ads/comments accidentally). Trim to a reasonable length (e.g. 2000 chars) before sending to the LLM — most posts are short, and this caps token cost.
- De-dupe: tag each processed post with a `data-engage-injected="true"` attribute so the observer doesn't double-inject on re-render.

Pseudo-flow:
```
observer detects new post node
  → find action bar within it
  → inject icon button
  → icon.onclick:
      extract post text
      open inline panel (positioned under the post)
      panel "Generate" click → sendMessage to background.js with {postText, tone, length, instruction, model}
      panel shows loading state → receives response → renders comment + copy button
```

---

## 4. Component 3 — `background.js` (service worker, API calls)

**Job:** own the API key, talk to OpenRouter, return results to content script.

```
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "GENERATE_COMMENT") {
    generateComment(msg.payload).then(sendResponse);
    return true; // keeps the message channel open for async response
  }
});

async function generateComment({ postText, tone, length, instruction, model }) {
  const { apiKey } = await chrome.storage.local.get("apiKey");
  const prompt = buildPrompt({ postText, tone, length, instruction });

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: model || "google/gemini-2.0-flash-001",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 150
    })
  });

  if (!res.ok) return { error: `API error: ${res.status}` };
  const data = await res.json();
  return { comment: data.choices[0].message.content };
}
```

Why the service worker (not content.js) makes the call: API key never touches the LinkedIn page context, so no LinkedIn page script can read it. Standard MV3 security separation.

---

## 5. Component 4 — Prompt template (`buildPrompt`)

This is the actual product quality lever — worth iterating on.

```
System framing (in the user message since some OpenRouter models ignore system role):

"You write short, genuine LinkedIn comments. Given a LinkedIn post, write ONE
comment that:
- reflects a {{tone}} tone
- is {{length}} (short = 1 sentence, medium = 2-3 sentences, long = short paragraph)
- adds a genuine thought, question, or specific reaction — never generic
  praise like 'Great post!' or 'So true!'
- does not repeat the post's own words back
- follows this extra instruction if given: {{instruction}}

Post:
\"\"\"{{postText}}\"\"\"

Reply with ONLY the comment text, nothing else."
```

Tone options for v1: Insightful, Supportive, Curious/Question, Contrarian, Witty.
Length options: Short, Medium, Long.

---

## 6. Component 5 — `popup.html` / `popup.js` (settings)

Fields:
- OpenRouter API key (password input, saved to `chrome.storage.local`)
- Default model (dropdown — Gemini Flash / Llama 3.3 free / DeepSeek free / custom string)
- Default tone
- "Test connection" button — fires a tiny 1-token request to confirm the key works

---

## 7. Component 6 — Inline panel (`inline-ui.js` / `.css`)

Injected as a floating card under the clicked post. Contents:
- Tone dropdown (pre-filled with default from settings, overridable per-comment)
- Length toggle
- Custom instruction text box (optional, free text — e.g. "mention I'm a final-year CS student")
- Generate button → loading spinner → result box
- Copy button + Regenerate button
- Close (X)

Keep it a plain injected `<div>` with scoped CSS classes (prefixed `.engage-ext-*` to avoid clashing with LinkedIn's own styles) — no need for React/shadow DOM at this scale, though a `shadow root` is worth doing later if LinkedIn's CSS starts bleeding into your panel.

---

## 8. Storage Schema (`chrome.storage.local`)

```json
{
  "apiKey": "sk-or-...",
  "defaultModel": "google/gemini-2.0-flash-001",
  "defaultTone": "insightful",
  "defaultLength": "medium"
}
```

That's it for v1 — no comment history, no post cache. Add a `history` array later if you want a "second brain" feature.

---

## 9. Error Handling

- No API key set → panel shows "Add your OpenRouter key in settings" with a button that opens the popup.
- API call fails (rate limit / bad key / network) → show the raw error message in the panel with a Retry button, don't fail silently.
- Post text extraction returns empty (edge case: image-only post, poll, etc.) → disable the icon or show "Can't read this post type yet."

---

## 10. Security / Safety Notes

- API key lives only in `chrome.storage.local`, only read by `background.js` — never passed into `content.js` or the page DOM.
- No `webRequest`/`declarativeNetRequest` use — the extension doesn't intercept or modify LinkedIn's own network traffic, only reads visible DOM text. This keeps it firmly in "reading the page" territory, same as any ad-blocker or Grammarly-style tool.
- No auto-clicking LinkedIn's own comment/post buttons — you always paste manually. This is the main thing that keeps this in "assistive tool" territory rather than "automation."

---

## 11. LinkedIn Policy & Risk Notes

**What LinkedIn's User Agreement (Section 8.2) actually prohibits:**
- Scraping or copying data from the platform via any technology, including browser plugins/add-ons
- Using bots or automated methods to access the service
- Overlaying or modifying the service's appearance, including inserting elements into it

By the letter of this, icon-injection + DOM text reading falls in the same technically-prohibited category as every commercial tool in this space (Engage AI, Taplio, etc.) — none of them are "officially authorized," LinkedIn just hasn't targeted single-user, non-bulk, manually-triggered tools. Real-world enforcement is driven by bot-like session patterns and high-velocity/bulk actions (mass profile pulls, auto-connecting, auto-posting), not a single injected icon that a human clicks once per post.

**Design constraints this drives (already reflected in the sections above, restated here as a checklist):**
1. No auto-posting or auto-clicking LinkedIn's own buttons — comment is always copy-pasted manually.
2. One post processed at a time, only on manual click — no background loop reading the whole feed.
3. No LinkedIn API/GraphQL calls, no `webRequest`/`declarativeNetRequest` interception — pure DOM read of what's already rendered.
4. No persistence of post/author text or profile data anywhere (not even locally) — process in memory for the single request, discard after generating the comment.
5. Minimal UI footprint — one small icon, no redesign of LinkedIn's interface, nothing placed over ads or other elements.
6. Client-side cooldown between generations (a few seconds) so usage pattern reads as human pace, not scripted.
7. **Keep it unpublished** — load unpacked via `chrome://extensions` → Developer Mode instead of submitting to the Chrome Web Store. No public listing, no Web Store review/data-disclosure process, smallest possible footprint for a personal-use tool.

Not legal advice — just a factual read of LinkedIn's published policy plus documented enforcement patterns, so the risk tradeoffs are clear going in.

---

## 12. Edge Cases to Handle

**Post content edge cases**
- Image-only or video-only post (no text body) → icon should disable or panel should say "Can't read this post type yet"
- Poll posts → same as above, text extraction will grab the question but not the options usefully
- Shared/reposted post with a quote comment on top → decide whether to extract just the quote, just the original, or both (recommend: both, labeled, so the LLM has full context)
- Carousel/document posts (PDF slides) → text extraction will likely miss the slide content entirely; treat as unsupported for v1
- Very long posts (LinkedIn allows up to ~3000 characters) → truncate before sending to the LLM, but truncate at a sentence boundary, not mid-word
- Non-English posts → decide whether to reply in the same language or always in English; simplest v1 rule: reply in the same language as the post (ask the model to do this explicitly in the prompt)
- Posts you've already commented on → not a blocker, but worth flagging in the UI so you don't double-comment

**DOM / UI edge cases**
- LinkedIn re-renders posts on re-scroll (virtualization can unmount/remount nodes) → the `data-engage-injected` guard needs to survive this, or you'll get duplicate icons; test by scrolling past a post and back
- LinkedIn ships frequent frontend updates → selectors can silently stop matching; keep all DOM selectors in one small `selectors.js` file so a break is a one-file fix, not a hunt through the codebase
- Multiple LinkedIn tabs open at once → each content script instance is independent, no shared state needed, but confirm the extension doesn't do anything weird with concurrent background requests
- LinkedIn's "expand post" (see more) truncation → if the DOM only has the truncated text unless clicked, extraction should target the full text node, not the visible truncated one (usually available in the DOM even when visually clamped by CSS)

**API / network edge cases**
- OpenRouter rate limit hit (common on free models) → show a clear "rate limited, try again in a moment" message, don't retry silently in a loop
- Model returns empty or a refusal-style response → detect empty/very-short output and show a "regenerate" prompt rather than displaying nothing
- No internet / OpenRouter down → standard network error handling, don't let the panel hang on a spinner forever (add a timeout, ~15s)
- API key invalid/expired → the "test connection" button in settings should catch this before it surprises you mid-scroll

**Extension lifecycle edge cases**
- Extension updates/reloads while a panel is open mid-generation → service worker can be killed/restarted by Chrome at any time in MV3; don't rely on in-memory state surviving between the click and the response, pass everything needed in the message payload
- User logs out of LinkedIn mid-session → content script should stop injecting icons if the feed DOM disappears (check for login/feed presence, not just URL)

---

## 13. Out-of-the-Box Ideas (worth considering, not required for v1)

- **Personal tone profile**: paste in 5-10 of your own best past LinkedIn comments once during setup; include them as few-shot examples in the prompt so generated comments actually sound like you, not like a generic AI voice. This is probably the single highest-leverage quality improvement available.
- **Post-type-aware prompting**: detect roughly what kind of post it is (job announcement, personal story, technical article, question/poll) via a quick classification pass or simple keyword heuristics, and adjust the prompt template per type — a comment on a "we're hiring" post should read differently than one on a "I failed and here's what I learned" post.
- **Multi-variant picker**: generate 2-3 short variants in one call (ask the model for a JSON array) instead of one comment, so you pick rather than regenerate — often cheaper than two separate calls.
- **Keyboard-driven flow**: a shortcut (e.g. `Alt+E`) to trigger generation on whatever post is currently in view, so you never have to reach for the mouse — matches how you'd actually use this while scrolling quickly.
- **Local usage log (private, never uploaded)**: a simple local table of {date, tone used, post type, edited-before-posting Y/N} — gives you a personal feedback loop on which tones/settings you actually keep using, so you can tune your defaults over time.
- **"Explain the angle" toggle**: alongside the comment, optionally show one line of why the model chose that angle (e.g. "asked a follow-up question since the post ended without a clear takeaway") — useful for learning to write better comments yourself over time, not just outsourcing it.
- **Portfolio double-duty**: since this doubles as a job-search artifact, keep a short demo GIF/recording folder as you build — milestone 4 (first working end-to-end generation) is usually the most demo-worthy moment to capture.
- **Model fallback chain**: if the default free/cheap model is rate-limited or errors, automatically retry once against a second configured model rather than failing outright — small addition, meaningfully more reliable in daily use.

---

## Build Order (suggested milestones)

1. Manifest + content.js icon injection (confirm icon shows up on real posts, no double-injection while scrolling)
2. popup.html + API key storage + test-connection button
3. background.js OpenRouter call, tested via hardcoded prompt first
4. Wire content.js click → background.js → inline panel showing raw result
5. Build out the real inline panel UI (tone/length/instruction controls)
6. Polish: loading states, error states, regenerate button
