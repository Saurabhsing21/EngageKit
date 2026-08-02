# EngageLens Chrome Extension

AI-assisted LinkedIn comment drafting for personal use. Click an icon on a feed post (or the floating FAB), generate a draft in the side panel via OpenRouter, then copy and paste into LinkedIn yourself — nothing auto-posts.

## Load unpacked

1. Open Chrome and go to `chrome://extensions`
2. Enable **Developer mode** (top right)
3. Click **Load unpacked**
4. Select this folder: `extension/` (the directory that contains `manifest.json`)
5. Open [linkedin.com/feed](https://www.linkedin.com/feed/)
6. Click the EngageLens toolbar icon → paste your OpenRouter API key → **Test connection** → **Save**
7. On the feed, click **Engage** on a post or the **EngageLens** FAB to open the side panel

## Features (v1)

- Per-post **Engage** blue pill (top-right of each feed post)
- Click Engage → expands “…more” if needed → extracts full post text → opens side panel with text auto-filled
- Floating **EngageLens** FAB (bottom-right) opens empty panel for manual paste
- Optional image paste/drop in side panel (reference only — generation uses text)
- Settings popup: OpenRouter API key, default model / tone / length, test connection
- API key stored only in `chrome.storage.local`, read only by the background service worker

## Project layout

```
extension/
├── manifest.json
├── background.js          # OpenRouter + sidePanel orchestration
├── content.js / content.css
├── selectors.js           # LinkedIn DOM selectors (patch here if LinkedIn breaks)
├── sidepanel.html/.js/.css
├── popup.html/.js/.css
├── lib/
│   ├── constants.js
│   ├── storage.js
│   └── prompt.js
└── icons/
```

## How to run automated unit tests

```bash
cd extension
npm test
```

Unit coverage: U1–U13 in `test/prompt.test.js` (see [engagelens-test-cases.md](../Docs/engagelens-test-cases.md)).
