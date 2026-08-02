/**
 * Load vanilla extension lib scripts into a fresh context for Node tests.
 */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function loadEngageLibs() {
  const root = path.join(__dirname, '..', '..');
  const sandbox = { console };
  sandbox.globalThis = sandbox;

  const files = [
    path.join(root, 'lib', 'constants.js'),
    path.join(root, 'lib', 'prompt.js')
  ];

  for (const file of files) {
    const code = fs.readFileSync(file, 'utf8');
    vm.runInNewContext(code, sandbox, { filename: file });
  }

  return {
    buildPrompt: sandbox.buildPrompt,
    truncateAtSentence: sandbox.truncateAtSentence,
    parseModelResponse: sandbox.parseModelResponse,
    ENGAGE_TONES: sandbox.ENGAGE_TONES,
    ENGAGE_LENGTHS: sandbox.ENGAGE_LENGTHS,
    ENGAGE_LIMITS: sandbox.ENGAGE_LIMITS,
    ENGAGE_DEFAULTS: sandbox.ENGAGE_DEFAULTS
  };
}

module.exports = { loadEngageLibs };
