/**
 * Shared enums and message types for EngageLens.
 * Loaded via importScripts in the service worker, or <script> in popup/sidepanel.
 */

const ENGAGE_TONES = [
  { id: 'insightful', label: 'Professional' },
  { id: 'supportive', label: 'Casual & Friendly' },
  { id: 'contrarian', label: 'Thought Leader' },
  { id: 'curious', label: 'Curious' },
  { id: 'witty', label: 'Witty' }
];

const ENGAGE_LENGTHS = [
  { id: 'short', label: 'Short' },
  { id: 'medium', label: 'Medium' },
  { id: 'long', label: 'Long' }
];

const ENGAGE_MODELS = [
  {
    id: 'google/gemini-2.0-flash-001',
    label: 'Gemini 2.0 Flash'
  },
  {
    id: 'google/gemini-2.5-flash',
    label: 'Gemini 2.5 Flash'
  },
  {
    id: 'openai/gpt-4o-mini',
    label: 'GPT-4o Mini'
  },
  {
    id: 'anthropic/claude-3.5-haiku',
    label: 'Claude 3.5 Haiku'
  },
  {
    id: 'deepseek/deepseek-chat',
    label: 'DeepSeek Chat'
  },
  {
    id: 'custom',
    label: 'Custom model…'
  }
];

const ENGAGE_DEFAULTS = {
  apiKey: '',
  defaultModel: 'google/gemini-2.0-flash-001',
  customModel: '',
  defaultTone: 'insightful',
  defaultTones: ['insightful', 'supportive'],
  defaultLength: 'medium'
};

const ENGAGE_MSG = {
  GENERATE_COMMENT: 'GENERATE_COMMENT',
  TEST_CONNECTION: 'TEST_CONNECTION',
  GET_SETTINGS: 'GET_SETTINGS',
  OPEN_SIDEPANEL: 'OPEN_SIDEPANEL',
  SET_POST_TEXT: 'SET_POST_TEXT',
  POST_TEXT_UPDATED: 'POST_TEXT_UPDATED'
};

const ENGAGE_LIMITS = {
  displayMaxChars: 10000,
  llmMaxChars: 2000,
  requestTimeoutMs: 15000,
  cooldownMs: 3000
};

// Expose on globalThis for shared use across scripts
globalThis.ENGAGE_TONES = ENGAGE_TONES;
globalThis.ENGAGE_LENGTHS = ENGAGE_LENGTHS;
globalThis.ENGAGE_MODELS = ENGAGE_MODELS;
globalThis.ENGAGE_DEFAULTS = ENGAGE_DEFAULTS;
globalThis.ENGAGE_MSG = ENGAGE_MSG;
globalThis.ENGAGE_LIMITS = ENGAGE_LIMITS;
