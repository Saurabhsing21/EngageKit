/**
 * chrome.storage.local helpers for EngageLens settings.
 */

async function getSettings() {
  const defaults = globalThis.ENGAGE_DEFAULTS || {
    apiKey: '',
    defaultModel: 'google/gemini-2.0-flash-001',
    customModel: '',
    defaultTone: 'insightful',
    defaultTones: ['insightful', 'supportive'],
    defaultLength: 'medium'
  };

  const result = await chrome.storage.local.get([
    'apiKey',
    'defaultModel',
    'customModel',
    'defaultTone',
    'defaultTones',
    'defaultLength',
    'pendingPostText',
    'engageMultiToneDefaultV2'
  ]);

  let defaultTones = result.defaultTones;
  if (!Array.isArray(defaultTones) || defaultTones.length === 0) {
    // Migrate single defaultTone → array; prefer Professional + Friendly
    if (result.defaultTone) {
      defaultTones = [result.defaultTone];
      if (result.defaultTone !== 'supportive') {
        defaultTones.push('supportive');
      }
      if (!defaultTones.includes('insightful') && result.defaultTone !== 'insightful') {
        defaultTones.unshift('insightful');
      }
    } else {
      defaultTones = defaults.defaultTones || ['insightful', 'supportive'];
    }
  }

  // One-time: ensure Professional + Casual & Friendly become the shipped default
  // for users who only had a single legacy tone stored.
  if (result.engageMultiToneDefaultV2 !== true) {
    const needsDualDefault =
      !Array.isArray(result.defaultTones) ||
      result.defaultTones.length === 0 ||
      (result.defaultTones.length === 1 &&
        (result.defaultTones[0] === 'supportive' ||
          result.defaultTones[0] === 'insightful'));

    if (needsDualDefault) {
      defaultTones = defaults.defaultTones || ['insightful', 'supportive'];
    }

    try {
      const patch = { engageMultiToneDefaultV2: true };
      if (needsDualDefault) {
        patch.defaultTones = defaultTones;
        patch.defaultTone = defaultTones[0];
      }
      chrome.storage.local.set(patch);
    } catch (_) {
      // ignore
    }
  }

  return {
    apiKey: result.apiKey ?? defaults.apiKey,
    defaultModel: result.defaultModel ?? defaults.defaultModel,
    customModel: result.customModel ?? defaults.customModel,
    defaultTone: result.defaultTone ?? defaultTones[0] ?? defaults.defaultTone,
    defaultTones,
    defaultLength: result.defaultLength ?? defaults.defaultLength,
    pendingPostText: result.pendingPostText ?? null
  };
}

async function saveSettings(partial) {
  const allowed = [
    'apiKey',
    'defaultModel',
    'customModel',
    'defaultTone',
    'defaultTones',
    'defaultLength',
    'pendingPostText'
  ];
  const toSave = {};
  for (const key of allowed) {
    if (Object.prototype.hasOwnProperty.call(partial, key)) {
      toSave[key] = partial[key];
    }
  }
  await chrome.storage.local.set(toSave);
  return getSettings();
}

async function getResolvedModel(settings) {
  const s = settings || (await getSettings());
  if (s.defaultModel === 'custom' && s.customModel) {
    return s.customModel.trim();
  }
  return s.defaultModel;
}

async function setPendingPostText(text) {
  await chrome.storage.local.set({ pendingPostText: text });
}

async function consumePendingPostText() {
  const { pendingPostText } = await chrome.storage.local.get('pendingPostText');
  if (pendingPostText != null) {
    await chrome.storage.local.remove('pendingPostText');
  }
  return pendingPostText ?? null;
}

globalThis.getSettings = getSettings;
globalThis.saveSettings = saveSettings;
globalThis.getResolvedModel = getResolvedModel;
globalThis.setPendingPostText = setPendingPostText;
globalThis.consumePendingPostText = consumePendingPostText;
