# EngageKit — Chrome Extension

Loadable Manifest V3 package for **EngageKit**: AI-assisted LinkedIn comment drafting via OpenRouter. Drafts are generated in the side panel; you copy and paste into LinkedIn yourself — nothing auto-posts.

For product overview, architecture, and docs, see the [repository README](../README.md).

## Load unpacked

1. Open Chrome → `chrome://extensions`
2. Enable **Developer mode**
3. **Load unpacked** → select this `extension/` folder (the one that contains `manifest.json`)
4. Open [linkedin.com/feed](https://www.linkedin.com/feed/)
5. Click the toolbar icon → paste your OpenRouter API key → **Test connection** → **Save**
6. On the feed, click **Engage** on a post or the floating button to open the side panel

## Layout

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
│   ├── prompt.js
│   └── extract.js
├── test/
└── icons/
```

## Tests

```bash
cd extension
npm test
```

Unit coverage lives in `test/` (see [engagelens-test-cases.md](../Docs/engagelens-test-cases.md)).
