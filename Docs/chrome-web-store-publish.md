# Publish EngageKit to the Chrome Web Store

Step-by-step guide to ship EngageKit publicly (or unlisted) on the [Chrome Web Store](https://chrome.google.com/webstore/category/extensions).

> **Note:** Your earlier PRD treated Web Store publishing as out of scope for v1 because a public listing increases visibility. Publishing is fine if you accept that tradeoff; **Unlisted** is a good middle ground (install only via direct link).

---

## 1. One-time developer setup

1. Open the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
2. Sign in with a Google account
3. Pay the **one-time $5** developer registration fee
4. Enable **2-Step Verification** on that Google account (required to publish)
5. Verify a contact email you actually check

Official docs: [Register as a developer](https://developer.chrome.com/docs/webstore/register) · [Publish](https://developer.chrome.com/docs/webstore/publish)

---

## 2. Host your privacy policy (required)

Chrome requires a **public HTTPS privacy policy URL** because EngageKit uses `storage` and host permissions.

1. Open [`Docs/privacy-policy.md`](privacy-policy.md)
2. Replace **`[REPLACE_WITH_YOUR_EMAIL]`** with your real contact email
3. Publish it somewhere public, for example:
   - GitHub Pages / a gist rendered as a page
   - A simple page on your personal site
   - Notion public page (HTTPS)
4. Copy the live URL — you will paste it into the dashboard Privacy tab

---

## 3. Build the upload ZIP

From the repo root:

```bash
chmod +x scripts/package-extension.sh
./scripts/package-extension.sh
```

This creates:

```text
dist/engagekit-<version>.zip
```

The ZIP has `manifest.json` at the **root** (required). It excludes `test/`, `node_modules`, and docs.

Do **not** zip the parent `EngageKit/` folder. Do **not** include `.env` or API keys.

---

## 4. Store listing assets to prepare

| Asset | Requirement |
|---|---|
| Store icon | 128×128 PNG (we ship `extension/icons/icon128.png`) |
| Screenshots | At least **1**, up to 5. Prefer **1280×800** or **640×400**. Show LinkedIn feed + Engage button + side panel |
| Small promo (optional) | 440×280 |
| Marquee promo (optional) | 1400×560 |
| Name | EngageKit (≤45 chars) |
| Summary | ≤132 chars (see copy below) |
| Description | Longer listing text (see copy below) |
| Category | **Productivity** |
| Language | English |

### Suggested summary (≤132 chars)

```text
Draft thoughtful LinkedIn comments with AI. Click Engage on a post, tweak tone, copy — you always paste manually.
```

### Suggested description

```text
EngageKit helps you write better LinkedIn comments in seconds — without auto-posting anything.

HOW IT WORKS
1. Install EngageKit and add your OpenRouter API key in Settings.
2. Open linkedin.com/feed and click Engage on a post.
3. Pick tone(s) and length in the side panel.
4. Generate a draft, edit if you want, then Copy and paste into LinkedIn yourself.

WHY ENGAGEKIT
• Human in the loop — AI drafts, you approve and post
• Multi-tone styles — Professional, Casual & Friendly, Thought Leader, Curious, Witty
• Local settings — your API key stays in Chrome storage on your device
• No EngageKit backend — generation goes from your browser to OpenRouter with your key

WHAT ENGAGEKIT DOES NOT DO
• Does not auto-post comments
• Does not bulk-process your feed in the background
• Does not require an EngageKit account

REQUIREMENTS
• An OpenRouter API key (you bring your own; usage billed to your OpenRouter account)
• LinkedIn in Chrome

Privacy policy: [PASTE YOUR LIVE PRIVACY POLICY URL]
Support: [PASTE YOUR EMAIL OR GITHUB ISSUES URL]
```

---

## 5. Permission justifications (dashboard)

Paste clear reasons — reviewers look for this.

| Permission | Justification |
|---|---|
| `storage` | Saves the user’s OpenRouter API key and default tone/length/model preferences locally so they do not re-enter settings each session. |
| `sidePanel` | Displays the comment drafting workspace (post text, tone chips, generate/copy) beside the LinkedIn tab. |
| Host: `https://www.linkedin.com/*` | Injects the Engage button on LinkedIn pages and reads only the post the user selects so its text can be drafted into a comment. |
| Host: `https://openrouter.ai/*` | Sends the user-initiated generation request to OpenRouter using the user’s own API key and returns the draft comment. |

### Single purpose statement (example)

```text
EngageKit’s single purpose is to help users draft LinkedIn comments with AI. The user manually triggers generation on a selected post and manually pastes the draft into LinkedIn.
```

### Remote code / data use

- No remote code execution; all extension logic is bundled locally.
- User data (post text + prompt settings) is sent to OpenRouter only when the user clicks Generate.
- Certify limited use of user data per Chrome Web Store requirements.

---

## 6. Upload & submit

1. Go to [Developer Dashboard](https://chrome.google.com/webstore/devconsole) → **New item**
2. Upload `dist/engagekit-<version>.zip`
3. Complete **Store listing**, **Privacy practices**, and **Distribution**
4. Distribution options:
   - **Public** — anyone can find/install
   - **Unlisted** — only people with the link (recommended for first release)
   - **Private** — limited to testers / a domain (if eligible)
5. Click **Submit for review**

Review often takes from a few hours to several days. You will get email updates.

---

## 7. After approval

- Share the store URL (or unlisted link)
- For updates: bump `"version"` in `manifest.json` → re-run `./scripts/package-extension.sh` → upload new ZIP → submit again

---

## Pre-submit checklist

- [ ] 2SV enabled; $5 fee paid
- [ ] Privacy policy live on HTTPS; email placeholders replaced
- [ ] ZIP built with `./scripts/package-extension.sh`
- [ ] No API keys in the ZIP
- [ ] Screenshots show real UI (feed + Engage + side panel)
- [ ] Permission justifications filled in
- [ ] Distribution set (Public / Unlisted / Private)
- [ ] Manual smoke test on LinkedIn feed after loading the packaged build unpacked once more

---

## Official references

- [Prepare your extension](https://developer.chrome.com/docs/webstore/prepare)
- [Publish in the Chrome Web Store](https://developer.chrome.com/docs/webstore/publish)
- [Creating a great listing](https://developer.chrome.com/docs/webstore/cws-dashboard-listing)
- [Privacy practices](https://developer.chrome.com/docs/webstore/cws-dashboard-privacy)
