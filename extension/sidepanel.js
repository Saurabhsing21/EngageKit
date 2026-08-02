/**
 * EngageLens side panel UI logic.
 */

(function () {
  'use strict';

  const MAX_IMAGES = 4;

  const els = {
    postText: document.getElementById('engage-post-text'),
    charCount: document.getElementById('engage-char-count'),
    postLoaded: document.getElementById('engage-post-loaded'),
    imageZone: document.getElementById('engage-image-zone'),
    imagePreviews: document.getElementById('engage-image-previews'),
    styleChips: document.getElementById('engage-style-chips'),
    lengthToggle: document.getElementById('engage-length-toggle'),
    instructionsCollapsed: document.getElementById('engage-instructions-collapsed'),
    instructionsExpanded: document.getElementById('engage-instructions-expanded'),
    instructionsSummary: document.getElementById('engage-instructions-summary'),
    instructionsEdit: document.getElementById('engage-instructions-edit'),
    instructionsDone: document.getElementById('engage-instructions-done'),
    instruction: document.getElementById('engage-instruction'),
    generate: document.getElementById('engage-generate'),
    generateLabel: document.getElementById('engage-generate-label'),
    help: document.getElementById('engage-help'),
    helpToggle: document.getElementById('engage-help-toggle'),
    error: document.getElementById('engage-error'),
    errorText: document.getElementById('engage-error-text'),
    retry: document.getElementById('engage-retry'),
    result: document.getElementById('engage-result'),
    resultText: document.getElementById('engage-result-text'),
    copy: document.getElementById('engage-copy'),
    regenerate: document.getElementById('engage-regenerate'),
    apiBanner: document.getElementById('engage-api-banner'),
    openSettings: document.getElementById('engage-open-settings'),
    openSettingsBanner: document.getElementById('engage-open-settings-banner')
  };

  const state = {
    tones: [...(ENGAGE_DEFAULTS.defaultTones || ['insightful', 'supportive'])],
    length: ENGAGE_DEFAULTS.defaultLength,
    loading: false,
    lastGeneratedAt: 0,
    hasApiKey: false,
    images: [],
    loadedFlashTimer: null
  };

  function openSettingsPopup() {
    const url = chrome.runtime.getURL('popup.html');
    chrome.windows
      .create({
        url,
        type: 'popup',
        width: 380,
        height: 520
      })
      .catch(() => {
        alert('Open EngageLens settings from the toolbar extension icon.');
      });
  }

  function updateCharCount() {
    const len = (els.postText.value || '').length;
    els.charCount.textContent = String(len);
  }

  function flashPostLoaded() {
    if (!els.postLoaded) return;
    els.postLoaded.classList.remove('engage-ext-hidden');
    clearTimeout(state.loadedFlashTimer);
    state.loadedFlashTimer = setTimeout(() => {
      els.postLoaded.classList.add('engage-ext-hidden');
    }, 2200);
  }

  function setPostText(text, { flash = true } = {}) {
    const max = ENGAGE_LIMITS.displayMaxChars;
    const value = (text || '').slice(0, max);
    els.postText.value = value;
    els.postText.scrollTop = 0;
    updateCharCount();
    if (flash && value.trim()) {
      flashPostLoaded();
    }
  }

  async function pullPendingPostText() {
    try {
      const pending = await consumePendingPostText();
      if (pending != null && String(pending).trim()) {
        setPostText(String(pending), { flash: true });
        return true;
      }
    } catch (_) {
      // ignore
    }
    return false;
  }

  function updateInstructionsSummary() {
    const text = (els.instruction.value || '').trim();
    if (text) {
      els.instructionsSummary.textContent = `Custom instructions on: “${text.slice(0, 60)}${text.length > 60 ? '…' : ''}”`;
    } else {
      els.instructionsSummary.textContent =
        'Custom instructions are off. Guide the AI response tone.';
    }
  }

  function renderStyleChips() {
    els.styleChips.innerHTML = '';
    ENGAGE_TONES.forEach((tone) => {
      const active = state.tones.includes(tone.id);
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className =
        'engage-ext-chip' + (active ? ' engage-ext-chip--active' : '');
      btn.dataset.tone = tone.id;
      btn.innerHTML = `<span class="engage-ext-chip__wand" aria-hidden="true">✦</span>${tone.label}`;
      btn.addEventListener('click', () => {
        if (state.tones.includes(tone.id)) {
          // Keep at least one tone selected
          if (state.tones.length === 1) return;
          state.tones = state.tones.filter((id) => id !== tone.id);
        } else {
          state.tones = [...state.tones, tone.id];
        }
        renderStyleChips();
        saveSettings({
          defaultTones: state.tones,
          defaultTone: state.tones[0]
        });
      });
      els.styleChips.appendChild(btn);
    });
  }

  function renderLengthToggle() {
    els.lengthToggle.innerHTML = '';
    ENGAGE_LENGTHS.forEach((len) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className =
        'engage-ext-segment' +
        (len.id === state.length ? ' engage-ext-segment--active' : '');
      btn.dataset.length = len.id;
      btn.textContent = len.label;
      btn.addEventListener('click', () => {
        state.length = len.id;
        renderLengthToggle();
        saveSettings({ defaultLength: len.id });
      });
      els.lengthToggle.appendChild(btn);
    });
  }

  function setLoading(loading) {
    state.loading = loading;
    els.generate.disabled = loading;
    els.regenerate.disabled = loading;
    els.generate.classList.toggle('engage-ext-btn--loading', loading);
    els.generateLabel.textContent = loading ? 'Generating…' : 'Generate Comment';
  }

  function showError(message) {
    els.error.classList.remove('engage-ext-hidden');
    els.result.classList.add('engage-ext-hidden');
    els.errorText.textContent = message;
  }

  function hideError() {
    els.error.classList.add('engage-ext-hidden');
    els.errorText.textContent = '';
  }

  function showResult(comment) {
    hideError();
    els.result.classList.remove('engage-ext-hidden');
    els.resultText.textContent = comment;
    // Auto-scroll sidebar so Draft Comment is in view after generate
    requestAnimationFrame(() => {
      const main = document.querySelector('.engage-ext-main');
      if (main) {
        els.result.scrollIntoView({ behavior: 'smooth', block: 'end' });
        // Ensure after layout (images/fonts) we still land on the draft
        setTimeout(() => {
          main.scrollTop = main.scrollHeight;
          els.result.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 50);
      } else {
        els.result.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }
    });
  }

  function refreshApiBanner(hasKey) {
    state.hasApiKey = !!hasKey;
    els.apiBanner.classList.toggle('engage-ext-banner--hidden', !!hasKey);
  }

  // --- Manual image attach (reference only; not sent to API) ---

  function renderImagePreviews() {
    els.imagePreviews.innerHTML = '';
    state.images.forEach((img) => {
      const wrap = document.createElement('div');
      wrap.className = 'engage-ext-image-thumb';
      const image = document.createElement('img');
      image.src = img.dataUrl;
      image.alt = 'Attached reference';
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'engage-ext-image-thumb__remove';
      remove.setAttribute('aria-label', 'Remove image');
      remove.textContent = '×';
      remove.addEventListener('click', () => {
        state.images = state.images.filter((i) => i.id !== img.id);
        renderImagePreviews();
      });
      wrap.appendChild(image);
      wrap.appendChild(remove);
      els.imagePreviews.appendChild(wrap);
    });
  }

  function addImageDataUrl(dataUrl) {
    if (!dataUrl || !String(dataUrl).startsWith('data:image/')) return;
    if (state.images.length >= MAX_IMAGES) return;
    state.images.push({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      dataUrl
    });
    renderImagePreviews();
  }

  function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function addImageFiles(fileList) {
    const files = Array.from(fileList || []).filter((f) => f.type.startsWith('image/'));
    for (const file of files) {
      if (state.images.length >= MAX_IMAGES) break;
      try {
        const dataUrl = await readFileAsDataUrl(file);
        addImageDataUrl(dataUrl);
      } catch (_) {
        // skip unreadable file
      }
    }
  }

  function wireImageZone() {
    if (!els.imageZone) return;

    els.imageZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      els.imageZone.classList.add('engage-ext-image-zone--drag');
    });
    els.imageZone.addEventListener('dragleave', () => {
      els.imageZone.classList.remove('engage-ext-image-zone--drag');
    });
    els.imageZone.addEventListener('drop', (e) => {
      e.preventDefault();
      els.imageZone.classList.remove('engage-ext-image-zone--drag');
      addImageFiles(e.dataTransfer?.files);
    });

    // Paste into textarea or image zone
    const onPaste = (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      const imageItems = Array.from(items).filter((i) => i.type.startsWith('image/'));
      if (!imageItems.length) return;
      // Don't block text paste — only consume image items
      imageItems.forEach((item) => {
        const file = item.getAsFile();
        if (file) addImageFiles([file]);
      });
    };
    els.postText.addEventListener('paste', onPaste);
    els.imageZone.addEventListener('paste', onPaste);
  }

  async function loadDefaults() {
    const settings = await getSettings();
    state.tones = Array.isArray(settings.defaultTones) && settings.defaultTones.length
      ? settings.defaultTones
      : [...(ENGAGE_DEFAULTS.defaultTones || ['insightful', 'supportive'])];
    state.length = settings.defaultLength || ENGAGE_DEFAULTS.defaultLength;
    refreshApiBanner(!!(settings.apiKey && settings.apiKey.trim()));
    renderStyleChips();
    renderLengthToggle();

    // Prefer pending text written by Engage click (may race with open)
    if (settings.pendingPostText != null && String(settings.pendingPostText).trim()) {
      setPostText(String(settings.pendingPostText), { flash: true });
      await chrome.storage.local.remove('pendingPostText');
    } else {
      await pullPendingPostText();
    }
  }

  async function generate() {
    if (state.loading) return;

    const postText = (els.postText.value || '').trim();
    if (!postText) {
      showError('Click Engage on a LinkedIn post, or paste the post text first.');
      return;
    }

    const now = Date.now();
    const cooldown = ENGAGE_LIMITS.cooldownMs;
    if (state.lastGeneratedAt && now - state.lastGeneratedAt < cooldown) {
      const wait = Math.ceil((cooldown - (now - state.lastGeneratedAt)) / 1000);
      showError(`Please wait ${wait}s before generating again.`);
      return;
    }

    if (!state.hasApiKey) {
      showError('Add your OpenRouter key in settings first.');
      refreshApiBanner(false);
      return;
    }

    hideError();
    setLoading(true);

    try {
      const response = await chrome.runtime.sendMessage({
        type: ENGAGE_MSG.GENERATE_COMMENT,
        payload: {
          postText,
          tone: state.tones,
          tones: state.tones,
          length: state.length,
          instruction: (els.instruction.value || '').trim()
        }
      });

      if (chrome.runtime.lastError) {
        showError(chrome.runtime.lastError.message);
        return;
      }

      if (!response) {
        showError('No response from background worker.');
        return;
      }

      if (response.error === 'NO_API_KEY') {
        refreshApiBanner(false);
        showError('Add your OpenRouter key in settings first.');
        return;
      }

      if (response.error) {
        showError(response.error);
        return;
      }

      const comment = (response.comment || '').trim();
      if (!comment || comment.length < 3) {
        showError('Model returned an empty response. Try regenerate.');
        return;
      }

      state.lastGeneratedAt = Date.now();
      showResult(comment);
    } catch (err) {
      showError(err?.message || 'Generation failed.');
    } finally {
      setLoading(false);
    }
  }

  async function copyResult() {
    const text = els.resultText.textContent || '';
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      const original = els.copy.textContent;
      els.copy.textContent = 'Copied!';
      setTimeout(() => {
        els.copy.textContent = original;
      }, 1200);
    } catch (_) {
      showError('Could not copy to clipboard.');
    }
  }

  function wireEvents() {
    els.postText.addEventListener('input', updateCharCount);

    els.instructionsEdit.addEventListener('click', () => {
      els.instructionsCollapsed.classList.add('engage-ext-hidden');
      els.instructionsExpanded.classList.remove('engage-ext-hidden');
      els.instruction.focus();
    });

    els.instructionsDone.addEventListener('click', () => {
      updateInstructionsSummary();
      els.instructionsExpanded.classList.add('engage-ext-hidden');
      els.instructionsCollapsed.classList.remove('engage-ext-hidden');
    });

    els.instruction.addEventListener('input', updateInstructionsSummary);

    els.generate.addEventListener('click', generate);
    els.retry.addEventListener('click', generate);
    els.regenerate.addEventListener('click', generate);
    els.copy.addEventListener('click', copyResult);

    els.helpToggle.addEventListener('click', () => {
      els.help.classList.toggle('engage-ext-hidden');
    });

    els.openSettings.addEventListener('click', openSettingsPopup);
    els.openSettingsBanner.addEventListener('click', openSettingsPopup);

    // Live updates when content script sets pending post text
    chrome.runtime.onMessage.addListener((msg) => {
      if (msg?.type === ENGAGE_MSG.POST_TEXT_UPDATED) {
        if (msg.postText != null && String(msg.postText).trim()) {
          setPostText(msg.postText, { flash: true });
        }
      }
    });

    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== 'local') return;
      if (changes.apiKey) {
        refreshApiBanner(
          !!(changes.apiKey.newValue && String(changes.apiKey.newValue).trim())
        );
      }
      if (changes.pendingPostText && changes.pendingPostText.newValue != null) {
        setPostText(changes.pendingPostText.newValue, { flash: true });
        chrome.storage.local.remove('pendingPostText');
      }
    });

    // Re-pull pending text when panel becomes visible (cold-start race)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        pullPendingPostText();
      }
    });
    window.addEventListener('focus', () => {
      pullPendingPostText();
    });

    wireImageZone();
  }

  async function init() {
    wireEvents();
    updateCharCount();
    updateInstructionsSummary();
    await loadDefaults();
    // Second chance shortly after open — catches late storage write
    setTimeout(() => {
      pullPendingPostText();
    }, 300);
  }

  init();
})();
