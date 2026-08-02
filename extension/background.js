/**
 * EngageLens background service worker.
 * Owns the API key, OpenRouter calls, and side panel open orchestration.
 */

importScripts('lib/constants.js', 'lib/storage.js', 'lib/prompt.js');

chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: false })
    .catch((err) => console.warn('[EngageKit] setPanelBehavior', err));
});

chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: false })
  .catch(() => {});

async function callOpenRouter({ apiKey, model, messages, maxTokens }) {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    ENGAGE_LIMITS.requestTimeoutMs
  );

  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'chrome-extension://engagelens',
        'X-Title': 'EngageKit'
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: maxTokens
      }),
      signal: controller.signal
    });

    if (res.status === 429) {
      return { error: 'Rate limited — try again in a moment.' };
    }
    if (res.status === 401 || res.status === 403) {
      return { error: 'Invalid or expired API key. Update it in settings.' };
    }
    if (!res.ok) {
      let detail = '';
      try {
        const body = await res.json();
        detail = body?.error?.message || JSON.stringify(body);
      } catch (_) {
        detail = await res.text().catch(() => '');
      }
      return { error: `API error: ${res.status}${detail ? ` — ${detail}` : ''}` };
    }

    const data = await res.json();
    const raw = data?.choices?.[0]?.message?.content?.trim() || '';
    if (!raw) {
      return { error: 'Model returned an empty response. Try regenerate.' };
    }

    const parsed =
      typeof parseModelResponse === 'function'
        ? parseModelResponse(raw)
        : { comment: raw, postType: null };

    const comment = (parsed.comment || '').trim();
    if (!comment) {
      return { error: 'Model returned an empty response. Try regenerate.' };
    }
    return {
      comment,
      postType: parsed.postType || null
    };
  } catch (err) {
    if (err?.name === 'AbortError') {
      return { error: 'Request timed out. Check your connection and try again.' };
    }
    return { error: err?.message || 'Network error. Check your connection.' };
  } finally {
    clearTimeout(timeout);
  }
}

async function generateComment(payload) {
  const settings = await getSettings();
  if (!settings.apiKey || !settings.apiKey.trim()) {
    return { error: 'NO_API_KEY' };
  }

  const model = await getResolvedModel(settings);
  const prompt = buildPrompt({
    postText: payload.postText,
    tone: payload.tones || payload.tone || settings.defaultTones || settings.defaultTone,
    length: payload.length || settings.defaultLength,
    instruction: payload.instruction || ''
  });

  return callOpenRouter({
    apiKey: settings.apiKey.trim(),
    model: payload.model || model,
    messages: [{ role: 'user', content: prompt }],
    maxTokens: 280
  });
}

async function testConnection() {
  const settings = await getSettings();
  if (!settings.apiKey || !settings.apiKey.trim()) {
    return { ok: false, error: 'No API key set.' };
  }

  const model = await getResolvedModel(settings);
  const result = await callOpenRouter({
    apiKey: settings.apiKey.trim(),
    model,
    messages: [{ role: 'user', content: 'Reply with exactly: ok' }],
    maxTokens: 5
  });

  if (result.error) {
    return { ok: false, error: result.error };
  }
  return { ok: true, sample: result.comment };
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg || !msg.type) return;

  if (msg.type === ENGAGE_MSG.OPEN_SIDEPANEL) {
    const tabId = sender.tab?.id;
    if (!tabId) {
      sendResponse({ error: 'No tab context.' });
      return;
    }

    const hasText = msg.postText != null && String(msg.postText).length > 0;
    const postText = hasText ? String(msg.postText) : null;

    // Write pending text FIRST (fire-and-forget) so a cold-starting sidepanel
    // can read it on load — must not await before sidePanel.open (user gesture).
    if (hasText) {
      chrome.storage.local.set({ pendingPostText: postText });
    } else {
      chrome.storage.local.remove('pendingPostText');
    }

    // Preserve user gesture: call open() immediately.
    const openPromise = chrome.sidePanel.open({ tabId });

    (async () => {
      try {
        await openPromise;
      } catch (err) {
        console.warn('[EngageKit] sidePanel.open', err);
        sendResponse({
          error:
            'Could not open side panel. Click the EngageKit toolbar icon once, then try the FAB again.'
        });
        return;
      }

      try {
        // Re-assert storage after open (belt-and-suspenders for race)
        if (hasText) {
          await setPendingPostText(postText);
        }

        try {
          const maybePromise = chrome.runtime.sendMessage({
            type: ENGAGE_MSG.POST_TEXT_UPDATED,
            postText
          });
          if (maybePromise && typeof maybePromise.catch === 'function') {
            maybePromise.catch(() => {});
          }
        } catch (_) {
          // No listeners yet — sidepanel will read pendingPostText on load
        }

        sendResponse({ ok: true });
      } catch (err) {
        sendResponse({ error: err?.message || 'Failed to open panel.' });
      }
    })();

    return true;
  }

  if (msg.type === ENGAGE_MSG.GENERATE_COMMENT) {
    generateComment(msg.payload || {})
      .then(sendResponse)
      .catch((err) => sendResponse({ error: err?.message || 'Generation failed.' }));
    return true;
  }

  if (msg.type === ENGAGE_MSG.TEST_CONNECTION) {
    testConnection()
      .then(sendResponse)
      .catch((err) => sendResponse({ ok: false, error: err?.message || 'Test failed.' }));
    return true;
  }

  if (msg.type === ENGAGE_MSG.GET_SETTINGS) {
    getSettings()
      .then((settings) => sendResponse({ settings }))
      .catch((err) => sendResponse({ error: err?.message }));
    return true;
  }
});
