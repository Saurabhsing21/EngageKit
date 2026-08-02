/**
 * EngageLens settings popup.
 */

(function () {
  'use strict';

  const els = {
    form: document.getElementById('engage-settings-form'),
    apiKey: document.getElementById('engage-api-key'),
    model: document.getElementById('engage-model'),
    customWrap: document.getElementById('engage-custom-model-wrap'),
    customModel: document.getElementById('engage-custom-model'),
    tone: document.getElementById('engage-tone'),
    length: document.getElementById('engage-length'),
    status: document.getElementById('engage-status'),
    test: document.getElementById('engage-test')
  };

  function fillSelects() {
    els.model.innerHTML = '';
    ENGAGE_MODELS.forEach((m) => {
      const opt = document.createElement('option');
      opt.value = m.id;
      opt.textContent = m.label;
      els.model.appendChild(opt);
    });

    els.tone.innerHTML = '';
    ENGAGE_TONES.forEach((t) => {
      const opt = document.createElement('option');
      opt.value = t.id;
      opt.textContent = t.label;
      els.tone.appendChild(opt);
    });

    els.length.innerHTML = '';
    ENGAGE_LENGTHS.forEach((l) => {
      const opt = document.createElement('option');
      opt.value = l.id;
      opt.textContent = l.label;
      els.length.appendChild(opt);
    });
  }

  function toggleCustomModel() {
    const isCustom = els.model.value === 'custom';
    els.customWrap.classList.toggle('engage-popup__hidden', !isCustom);
  }

  function setStatus(text, kind) {
    els.status.textContent = text;
    els.status.classList.remove('engage-popup__status--ok', 'engage-popup__status--err');
    if (kind === 'ok') els.status.classList.add('engage-popup__status--ok');
    if (kind === 'err') els.status.classList.add('engage-popup__status--err');
  }

  function updateStatusFromKey(apiKey) {
    if (apiKey && apiKey.trim()) {
      setStatus('API key saved locally', 'ok');
    } else {
      setStatus('No API key', null);
    }
  }

  async function load() {
    fillSelects();
    const settings = await getSettings();
    els.apiKey.value = settings.apiKey || '';
    els.model.value = settings.defaultModel || ENGAGE_DEFAULTS.defaultModel;
    els.customModel.value = settings.customModel || '';
    els.tone.value = settings.defaultTone || ENGAGE_DEFAULTS.defaultTone;
    els.length.value = settings.defaultLength || ENGAGE_DEFAULTS.defaultLength;
    toggleCustomModel();
    updateStatusFromKey(settings.apiKey);
  }

  async function save(e) {
    if (e) e.preventDefault();
    await saveSettings({
      apiKey: els.apiKey.value.trim(),
      defaultModel: els.model.value,
      customModel: els.customModel.value.trim(),
      defaultTone: els.tone.value,
      defaultLength: els.length.value
    });
    updateStatusFromKey(els.apiKey.value);
    setStatus('Saved', 'ok');
  }

  async function testConnection() {
    await save();
    els.test.disabled = true;
    setStatus('Testing…', null);
    try {
      const response = await chrome.runtime.sendMessage({
        type: ENGAGE_MSG.TEST_CONNECTION
      });
      if (chrome.runtime.lastError) {
        setStatus(chrome.runtime.lastError.message, 'err');
        return;
      }
      if (response?.ok) {
        setStatus('Connected — key works', 'ok');
      } else {
        setStatus(response?.error || 'Connection failed', 'err');
      }
    } catch (err) {
      setStatus(err?.message || 'Connection failed', 'err');
    } finally {
      els.test.disabled = false;
    }
  }

  els.model.addEventListener('change', toggleCustomModel);
  els.form.addEventListener('submit', save);
  els.test.addEventListener('click', testConnection);

  // Auto-save on blur for convenience
  ['apiKey', 'customModel'].forEach((id) => {
    const el = document.getElementById(
      id === 'apiKey' ? 'engage-api-key' : 'engage-custom-model'
    );
    el.addEventListener('change', () => save());
  });
  els.model.addEventListener('change', () => save());
  els.tone.addEventListener('change', () => save());
  els.length.addEventListener('change', () => save());

  load();
})();
