/**
 * Unit tests for buildPrompt / truncateAtSentence
 * Cases: U1–U13 from Docs/engagelens-test-cases.md
 *
 * TDD: these tests define required behavior. U2 must fail until
 * buildPrompt uses a delimiter safe for posts containing """.
 */

const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');
const { loadEngageLibs } = require('./helpers/loadLibs.js');

describe('EngageLens prompt helpers', () => {
  let buildPrompt;
  let truncateAtSentence;
  let ENGAGE_TONES;
  let ENGAGE_LENGTHS;
  let ENGAGE_LIMITS;

  before(() => {
    const libs = loadEngageLibs();
    buildPrompt = libs.buildPrompt;
    truncateAtSentence = libs.truncateAtSentence;
    ENGAGE_TONES = libs.ENGAGE_TONES;
    ENGAGE_LENGTHS = libs.ENGAGE_LENGTHS;
    ENGAGE_LIMITS = libs.ENGAGE_LIMITS;
  });

  // --- U1 ---
  it('U1: embeds post, tone, length; no leftover mustache placeholders', () => {
    const post =
      'Shipping in public taught me more than any course. What is your take on weekly demos?';
    const prompt = buildPrompt({
      postText: post,
      tone: 'insightful',
      length: 'medium',
      instruction: ''
    });

    assert.match(prompt, /Tone:.*insightful/i);
    assert.match(prompt, /Length: medium \(/);
    assert.ok(prompt.includes(post));
    assert.equal(prompt.includes('{{'), false);
    assert.equal(prompt.includes('}}'), false);
    assert.match(prompt, /same language the post is written in/);
    assert.match(prompt, /SOUND LIKE A HUMAN/);
    assert.match(prompt, /QUESTION RULE/);
    assert.match(prompt, /do NOT end with a question/);
  });

  it('U1b: Curious tone allows ending with a question', () => {
    const prompt = buildPrompt({
      postText: 'We shipped a new analytics dashboard today.',
      tone: 'curious',
      length: 'short',
      instruction: ''
    });
    assert.match(prompt, /MAY end with one genuine/);
    assert.equal(/do NOT end with a question/.test(prompt), false);
  });

  // --- U2 ---
  it('U2: post text containing """ does not break prompt delimiting', () => {
    const post =
      'He said """this is the only way""" and I disagreed for three reasons.';
    const prompt = buildPrompt({
      postText: post,
      tone: 'curious',
      length: 'short',
      instruction: ''
    });

    // Full post content must survive (including its own triple quotes)
    assert.ok(
      prompt.includes('"""this is the only way"""'),
      'post body with triple quotes should remain intact'
    );
    assert.ok(
      prompt.includes('three reasons'),
      'post body tail should remain in prompt'
    );

    // Outer fence must be marker-based, not """
    assert.match(prompt, /-----BEGIN_LINKEDIN_POST-----/);
    assert.match(prompt, /-----END_LINKEDIN_POST-----/);
    assert.equal(
      prompt.includes('Post:\n"""'),
      false,
      'must not wrap the post in """ fences'
    );

    // Body between markers should be recoverable uniquely
    const bodyMatch = prompt.match(
      /-----BEGIN_LINKEDIN_POST-----\n([\s\S]*?)\n-----END_LINKEDIN_POST-----/
    );
    assert.ok(bodyMatch, 'delimited post body should be extractable');
    assert.equal(bodyMatch[1], post);
  });

  // --- U3 ---
  it('U3: empty instruction does not insert undefined', () => {
    const prompt = buildPrompt({
      postText: 'A short update about hiring junior engineers.',
      tone: 'supportive',
      length: 'short'
    });
    assert.equal(prompt.includes('undefined'), false);
    assert.match(prompt, /\(none\)|extra instruction/i);
  });

  // --- U4 ---
  it('U4: very long post is truncated at sentence boundary before insert', () => {
    const sentences = [];
    for (let i = 0; i < 80; i++) {
      sentences.push(`Sentence number ${i} adds more content about startups.`);
    }
    const post = sentences.join(' ');
    assert.ok(post.length > 3000);

    const prompt = buildPrompt({
      postText: post,
      tone: 'insightful',
      length: 'long',
      instruction: ''
    });

    const max = ENGAGE_LIMITS.llmMaxChars;
    // Extract body between markers (implementation-defined markers)
    const bodyMatch = prompt.match(
      /-----BEGIN_LINKEDIN_POST-----\n([\s\S]*?)\n-----END_LINKEDIN_POST-----/
    );

    assert.ok(bodyMatch, 'should find delimited post body');
    const body = bodyMatch[1];
    assert.ok(body.length <= max, `body length ${body.length} should be <= ${max}`);
    assert.ok(!body.includes('Sentence number 79'), 'tail of long post should be cut');
    assert.match(body, /\.$/, 'truncation should prefer ending on a sentence');
  });

  // --- U5 ---
  it('U5: non-English post still gets same-language instruction', () => {
    const prompt = buildPrompt({
      postText: 'आज हमने अपना नया प्रोडक्ट लॉन्च किया। आपका क्या सोचना है?',
      tone: 'curious',
      length: 'medium',
      instruction: ''
    });
    assert.match(prompt, /same language the post is written in/);
  });

  // --- U6 ---
  it('U6: text under limit returned unchanged (trimmed)', () => {
    const text = '  Short post about mentorship.  ';
    const out = truncateAtSentence(text, 2000);
    assert.equal(out, 'Short post about mentorship.');
  });

  // --- U7 ---
  it('U7: over-limit mid-sentence truncates to last full sentence', () => {
    const first = 'A'.repeat(100) + ' complete thought.';
    const second = 'B'.repeat(100) + ' another thought.';
    const third = 'C'.repeat(2000) + ' unfinished';
    const text = `${first} ${second} ${third}`;
    const max = 250;
    const out = truncateAtSentence(text, max);

    assert.ok(out.length <= max);
    assert.ok(out.endsWith('.'), 'should end at sentence boundary');
    assert.equal(out.includes('unfinished'), false);
    assert.equal(out.endsWith('thoug'), false); // not mid-word of thought
  });

  // --- U8 ---
  it('U8: run-on with no sentence punctuation falls back without crashing', () => {
    const text = 'word '.repeat(600).trim();
    const max = 200;
    const out = truncateAtSentence(text, max);
    assert.ok(out.length <= max);
    assert.equal(out.includes('undefined'), false);
  });

  // --- U9 ---
  it('U9: each tone maps to a distinct non-empty phrase in the prompt', () => {
    const phrases = new Set();
    for (const tone of ENGAGE_TONES) {
      const prompt = buildPrompt({
        postText: 'Testing tone mapping on a normal LinkedIn post.',
        tone: tone.id,
        length: 'medium',
        instruction: ''
      });
      const match = prompt.match(/Tone: (.+)\n/);
      assert.ok(match && match[1].trim().length > 0, `tone ${tone.id} should map`);
      phrases.add(match[1].trim());
      assert.equal(prompt.includes('undefined'), false);
    }
    assert.equal(phrases.size, 5);
  });

  // --- U10 ---
  it('U10: each length maps to a distinct non-empty phrase', () => {
    const phrases = new Set();
    for (const length of ENGAGE_LENGTHS) {
      const prompt = buildPrompt({
        postText: 'Testing length mapping on a normal LinkedIn post.',
        tone: 'witty',
        length: length.id,
        instruction: ''
      });
      assert.match(prompt, new RegExp(`Length: ${length.id} \\(`));
      phrases.add(length.id);
    }
    assert.equal(phrases.size, 3);
  });

  // --- U11 ---
  it('U11: unset tone/length fall back to sensible defaults', () => {
    const prompt = buildPrompt({
      postText: 'Defaults should appear when tone and length are missing.',
      tone: undefined,
      length: null,
      instruction: ''
    });
    assert.match(prompt, /Tone:.*insightful/i);
    assert.match(prompt, /Length: medium \(/);
    assert.equal(prompt.includes('undefined'), false);
  });

  // --- U12 ---
  it('U12: nullish postText does not throw', () => {
    assert.doesNotThrow(() => truncateAtSentence(null, 100));
    assert.doesNotThrow(() => truncateAtSentence(undefined, 100));
    assert.doesNotThrow(() =>
      buildPrompt({ postText: null, tone: 'curious', length: 'short' })
    );
    assert.equal(truncateAtSentence(undefined, 100), '');
  });

  // --- U13 ---
  it('U13: whitespace-only instruction treated as empty', () => {
    const prompt = buildPrompt({
      postText: 'Instruction whitespace should not leak.',
      tone: 'supportive',
      length: 'short',
      instruction: '   '
    });
    assert.match(prompt, /\(none\)/);
    assert.equal(prompt.includes('instruction if given:    '), false);
  });
});

describe('parseModelResponse', () => {
  let parseModelResponse;

  before(() => {
    const libs = loadEngageLibs();
    parseModelResponse = libs.parseModelResponse;
  });

  it('parses JSON with post_type and comment', () => {
    const result = parseModelResponse(
      '{"post_type":"project","comment":"What problem were you solving first?"}'
    );
    assert.equal(result.postType, 'project');
    assert.equal(result.comment, 'What problem were you solving first?');
  });

  it('strips markdown fences around JSON', () => {
    const result = parseModelResponse(
      '```json\n{"post_type":"news","comment":"Curious how durable that edge is."}\n```'
    );
    assert.equal(result.postType, 'news');
    assert.equal(result.comment, 'Curious how durable that edge is.');
  });

  it('falls back to plain text when JSON is missing', () => {
    const result = parseModelResponse('Just a plain comment.');
    assert.equal(result.comment, 'Just a plain comment.');
    assert.equal(result.postType, null);
  });
});
