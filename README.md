# EngageKit

**AI-assisted LinkedIn engagement for thoughtful, human-approved comments.**

EngageKit is a personal Manifest V3 Chrome extension that helps you draft high-quality LinkedIn comments in seconds. Click **Engage** on any feed post, tune tone and length in the side panel, generate a draft via [OpenRouter](https://openrouter.ai), then copy and paste into LinkedIn yourself — nothing is auto-posted.

---

## Why EngageKit

Writing a genuine comment on every post worth engaging with is slow. Skipping comments costs visibility; defaulting to “Great post!” costs credibility. EngageKit removes the blank-page friction while keeping you in full control of what actually goes live.

| Principle | How we honor it |
|---|---|
| Human in the loop | Drafts only — you review, edit, and paste |
| Privacy-first | No backend, no accounts; API key stays in `chrome.storage.local` |
| Lowest LinkedIn risk | Manual trigger only; no bulk scrape; no auto-post |
| Maintainable | LinkedIn selectors isolated in one module for fast patching |

---

## Features

- **Per-post Engage button** — appears on feed posts near the author row
- **Side panel workspace** — post text auto-fills when you click Engage
- **Multi-tone drafting** — Professional, Casual & Friendly, Thought Leader, Curious, Witty (combine as needed)
- **Length control** — Short / Medium / Long
- **Custom instructions** — one-off steering (“mention I’m a CS student”)
- **Copy & regenerate** — iterate without re-entering the post
- **Optional image attach** — visual reference in the panel (generation uses text)
- **Floating FAB** — open the panel anytime to paste a post manually
- **Local settings** — OpenRouter key, model, defaults; test connection from the popup

---

## Quick start

### Prerequisites

- Google Chrome (or another Chromium browser with extension support)
- An [OpenRouter](https://openrouter.ai) API key

### Install (load unpacked)

1. Clone this repository  
   `git clone https://github.com/<your-username>/EngageKit.git`
2. Open `chrome://extensions`
3. Enable **Developer mode**
4. Click **Load unpacked** → select the `extension/` folder
5. Open [linkedin.com/feed](https://www.linkedin.com/feed/)
6. Click the EngageKit toolbar icon → enter your OpenRouter API key → **Test connection** → **Save**
7. On the feed, click **Engage** on a post (or the floating button) to open the side panel

### Run unit tests

```bash
cd extension
npm test
```

---

## How it works

```
LinkedIn feed
    │  Engage click
    ▼
Content script ── extracts post text ──► Background service worker
                                              │
                                              ▼
                                         OpenRouter LLM
                                              │
                                              ▼
Side panel ◄── draft comment (copy / regenerate)
```

1. The content script injects Engage controls and extracts visible post text.
2. The background service worker builds the prompt and calls OpenRouter (key never leaves the worker).
3. The side panel shows the draft for you to copy into LinkedIn’s own comment box.

---

## Project structure

```
EngageKit/
├── README.md                 # This file
├── Docs/                     # PRD, architecture, test plans
└── extension/                # Chrome extension (load this folder)
    ├── manifest.json
    ├── background.js         # OpenRouter + side panel orchestration
    ├── content.js            # Engage button + FAB injection
    ├── selectors.js          # LinkedIn DOM selectors (patch here)
    ├── sidepanel.*           # Generation UI
    ├── popup.*               # Settings
    ├── lib/                  # Shared constants, storage, prompt, extract
    └── test/                 # Unit tests
```

---

## Configuration

| Setting | Where | Notes |
|---|---|---|
| OpenRouter API key | Extension popup | Stored only in `chrome.storage.local` |
| Default model | Popup | Paid OpenRouter models (e.g. Gemini Flash) |
| Default tones / length | Side panel chips | Persisted locally |

Never commit API keys. Keep secrets out of git (e.g. ignore `.env`).

---

## Safety & scope

**In scope**

- Single-post, user-triggered comment drafts
- Local settings and optional local-only usage reflection later

**Out of scope (by design)**

- Auto-posting or driving LinkedIn’s UI on your behalf
- Bulk / background processing of the feed
- Multi-user accounts, billing, or a hosted backend
- Chrome Web Store publishing (personal / unpacked install for now)

Use thoughtfully. EngageKit is built for personal productivity, not spam or automation abuse.

---

## Documentation

| Doc | Description |
|---|---|
| [PRD](Docs/engagelens-prd.md) | Product goals, stories, and non-goals |
| [Architecture](Docs/linkedin-extension-architecture%20(1).md) | Extension design and LinkedIn risk notes |
| [Test plan](Docs/engagelens-test-plan.md) | Manual and automated test strategy |
| [Test cases](Docs/engagelens-test-cases.md) | Unit / integration / manual cases |
| [Extension README](extension/README.md) | Load instructions and layout details |

---

## Tech stack

- Manifest V3 Chrome extension (vanilla JavaScript — no bundler)
- `chrome.sidePanel` + content scripts + service worker
- OpenRouter for LLM inference
- Node.js test runner for prompt / extract unit tests

---

## Roadmap (high level)

- [x] Per-post Engage + side panel generation
- [x] Tone / length / custom instruction
- [x] Local API key + model settings
- [ ] Multiple draft variants per generate
- [ ] Optional local “voice” examples (few-shot from your past comments)
- [ ] Keyboard shortcut to open the panel

---

## Contributing

This started as a personal tool. If you fork it:

1. Keep selector changes confined to `extension/selectors.js`
2. Run `npm test` inside `extension/` before submitting changes
3. Do not add auto-post or bulk-feed behavior without a clear, documented risk review

---

## License

Personal / educational use. Add a formal license file if you open-source or distribute publicly.

---

Built to turn LinkedIn engagement from a chore into a deliberate, two-click draft — with you still writing the final word.
