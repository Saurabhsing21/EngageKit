# Privacy Policy — EngageKit

**Last updated:** August 2, 2026

EngageKit (“the Extension”) is a Chrome browser extension that helps you draft LinkedIn comments using an AI model you connect via your own OpenRouter API key.

This policy explains what data is handled, where it goes, and what we do **not** do.

## 1. Who we are

EngageKit is provided as a personal / independent software product. Contact for privacy questions: **[REPLACE_WITH_YOUR_EMAIL]**

## 2. Data the Extension handles

### 2.1 Data you provide

| Data | Purpose | Storage | Shared with |
|---|---|---|---|
| OpenRouter API key | Authenticate AI requests you initiate | Stored locally in `chrome.storage.local` on your device | Sent only to OpenRouter when you generate a comment or test the connection |
| Default model, tone(s), length preferences | Remember your settings | Local `chrome.storage.local` only | Not shared |
| Optional custom instruction text | Steer a single draft | Held in the side panel UI for the request | Included in the prompt sent to OpenRouter when you click Generate |
| LinkedIn post text (selected by you) | Generate a comment draft for that post | Briefly held in local storage / memory for the open request | Sent to OpenRouter only when you click Generate |

### 2.2 Data we do **not** collect

EngageKit does **not**:

- Create user accounts or require sign-in to EngageKit
- Operate a EngageKit backend server that receives your posts or API key
- Automatically scrape your feed in the background
- Auto-post comments to LinkedIn
- Sell, rent, or broker personal data
- Use your data for advertising
- Track browsing history outside the LinkedIn pages where the Extension runs

## 3. How LinkedIn post text is used

When you click **Engage** on a LinkedIn feed post (or paste text into the side panel) and then click **Generate Comment**:

1. The Extension reads the visible text of that post (or the text you pasted).
2. That text, plus your selected tone/length/instruction, is sent in an API request to **OpenRouter** (`https://openrouter.ai`) using **your** API key.
3. OpenRouter routes the request to the AI model you configured.
4. The draft comment is returned to the Extension UI for you to copy. You paste it into LinkedIn yourself.

Post text is processed only for requests you explicitly start.

## 4. Third-party services

### OpenRouter

AI generation is performed by [OpenRouter](https://openrouter.ai). Their handling of API requests is governed by OpenRouter’s own terms and privacy policy. You must supply your own OpenRouter API key and are responsible for that account.

### LinkedIn

The Extension injects UI on `linkedin.com` pages to help you draft comments. It does not post on your behalf. Your use of LinkedIn remains subject to LinkedIn’s terms.

### Google / Chrome

Installation and updates through the Chrome Web Store are subject to Google’s policies. Extension settings stored via Chrome APIs remain on your device unless you sync Chrome data under your Google account settings.

## 5. Permissions explained

| Permission / host | Why it is needed |
|---|---|
| `storage` | Save your API key and preferences locally |
| `sidePanel` | Show the drafting workspace |
| `https://www.linkedin.com/*` | Inject the Engage button and read the post you select |
| `https://openrouter.ai/*` | Call OpenRouter to generate drafts |

## 6. Data retention

- Local settings remain until you clear them, uninstall the Extension, or clear Chrome extension storage.
- EngageKit does not retain a server-side copy of your posts or API key (there is no EngageKit server).
- OpenRouter / model providers may retain API logs per their policies.

## 7. Children’s privacy

EngageKit is not directed at children under 13. Do not use the Extension if you are under 13.

## 8. Security

Your OpenRouter API key is stored in Chrome’s local extension storage and is read by the Extension’s background service worker to make API calls. Protect your device and never share your API key. If you believe your key was exposed, revoke it in the OpenRouter dashboard and create a new one.

## 9. Your choices

You can:

- Delete your API key from Extension settings at any time
- Uninstall the Extension to remove local Extension data (subject to Chrome’s uninstall behavior)
- Stop sending data to OpenRouter by not clicking Generate / by removing your API key

## 10. Changes to this policy

We may update this policy when features or practices change. The “Last updated” date at the top will be revised. Continued use after changes means you accept the updated policy.

## 11. Contact

Questions about this privacy policy: **[REPLACE_WITH_YOUR_EMAIL]**
