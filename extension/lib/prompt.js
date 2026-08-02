/**
 * Prompt builder for EngageLens comment generation.
 * Truncates post text at a sentence boundary (~2000 chars).
 * Model is asked to return JSON: { post_type, comment }.
 */

const TONE_MAP = {
  insightful:
    'insightful / professional — sharp observation, specific, no fluff',
  supportive:
    'supportive / casual & friendly — warm, encouraging, human',
  contrarian:
    'thought-leader / lightly contrarian — challenge an assumption respectfully',
  curious: 'curious — ask a real, specific follow-up question',
  witty: 'witty — light humor, still respectful and on-topic'
};

const LENGTH_MAP = {
  short: 'short',
  medium: 'medium',
  long: 'long'
};

const POST_TYPES = [
  'achievement',
  'news',
  'journey',
  'company',
  'project',
  'general'
];

function truncateAtSentence(text, maxChars) {
  const trimmed = (text || '').trim();
  if (trimmed.length <= maxChars) return trimmed;

  const slice = trimmed.slice(0, maxChars);
  const sentenceEnd = Math.max(
    slice.lastIndexOf('. '),
    slice.lastIndexOf('! '),
    slice.lastIndexOf('? '),
    slice.lastIndexOf('.\n'),
    slice.lastIndexOf('!\n'),
    slice.lastIndexOf('?\n')
  );

  if (sentenceEnd > maxChars * 0.5) {
    return slice.slice(0, sentenceEnd + 1).trim();
  }

  const lastSpace = slice.lastIndexOf(' ');
  if (lastSpace > maxChars * 0.5) {
    return slice.slice(0, lastSpace).trim();
  }

  return slice.trim();
}

function normalizeToneIds(tone) {
  if (Array.isArray(tone)) {
    return tone.filter((id) => TONE_MAP[id]);
  }
  if (tone && TONE_MAP[tone]) return [tone];
  return ['insightful', 'supportive'];
}

function buildPrompt({ postText, tone, length, instruction }) {
  const limits = globalThis.ENGAGE_LIMITS || { llmMaxChars: 2000 };
  const truncated = truncateAtSentence(postText, limits.llmMaxChars);

  const toneIds = normalizeToneIds(tone);
  const toneLabel = toneIds.map((id) => TONE_MAP[id]).join('; ');
  const lengthLabel = LENGTH_MAP[length] || LENGTH_MAP.medium;
  const extra = (instruction || '').trim();
  const allowQuestions = toneIds.includes('curious');

  const questionRule = allowQuestions
    ? `- Tone includes Curious: you MAY end with one genuine, specific follow-up question when it fits.`
    : `- Tone is NOT Curious: do NOT end with a question. Do NOT ask the author anything. Make a statement/reaction only — no "?" at the end.`;

  // Avoid """ fences — LinkedIn posts can contain triple quotes and break delimiting.
  const safeBody = truncated
    .replace(/-----BEGIN_LINKEDIN_POST-----/g, '---BEGIN_LINKEDIN_POST---')
    .replace(/-----END_LINKEDIN_POST-----/g, '---END_LINKEDIN_POST---');

  const commentHint = allowQuestions
    ? 'the comment text only'
    : 'the comment text only — statement/reaction, no question mark';

  return `You're a real person scrolling LinkedIn, about to leave a genuine comment on a post.

STEP 1 — Identify what kind of post this is, using this taxonomy:
- "achievement": personal milestone, promotion, certification, award, new job, "excited to share"
- "news": sharing industry news, a launch, a stat, research/AI model results, "X just happened"
- "journey": personal reflection, a struggle-to-growth story, lessons learned over time
- "company": the author's team/company shipped something, hit a milestone, raised funding
- "project": the author built something themselves — a tool, app, side project, technical work
- "general": anything that doesn't clearly fit the above

STEP 2 — React according to the matching strategy (respect the QUESTION RULE below):
- achievement → genuine congratulations, specific to what they actually achieved (never generic "congrats!")
- news → share a real opinion or take — agree with a reason, or add a nuance they didn't mention
- journey → acknowledge the specific effort/struggle with respect (not flattery)
- company → react to what they shipped / the milestone with a concrete take on the result
- project → react to what they built — note something specific about the approach or outcome
- general → react like someone who actually read it and has a real take, not a summary

QUESTION RULE (overrides STEP 2):
${questionRule}
- Even for news/journey/company/project: if Curious is NOT selected, never turn the comment into a question.

TONE & LENGTH
- Tone: ${toneLabel}
- Length: ${lengthLabel} (short = 1 sentence, medium = 2-3 sentences, long = short paragraph)

SOUND LIKE A HUMAN, NOT AN AI
- Write like you're texting a colleague you respect — warm, direct, a little imperfect.
- Use contractions (it's, that's, I've). Vary sentence length.
- Never open with "Great post", "This resonates", "I love how", "Such an important point".
- Never use: "resonates", "delve", "unpack", "game-changer", "in today's world", "navigate the landscape", "at the end of the day", "it's important to note", "elevate", "leverage" (unless the post is about finance), "unlock", "journey" (unless it's literally about a journey).
- No emojis unless the post is emoji-heavy. No hashtags, ever.
- Don't summarize the post back — react to it.

CONTENT RULES
- Never repeat the post's own phrasing back.
- Reply in the same language the post is written in.
- Follow this extra instruction if given: ${extra || '(none)'}

POST:
-----BEGIN_LINKEDIN_POST-----
${safeBody}
-----END_LINKEDIN_POST-----

Respond with ONLY valid JSON, no markdown fences, no extra text:
{"post_type": "<one of: achievement, news, journey, company, project, general>", "comment": "<${commentHint}>"}`;
}

/**
 * Parse model output into { comment, postType }.
 * Accepts JSON object, fenced JSON, or plain comment text fallback.
 */
function parseModelResponse(raw) {
  const text = (raw || '').trim();
  if (!text) {
    return { comment: '', postType: null };
  }

  let candidate = text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  const jsonMatch = candidate.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      const comment = String(parsed.comment || parsed.text || '').trim();
      let postType = String(parsed.post_type || parsed.postType || '')
        .trim()
        .toLowerCase();
      if (postType && !POST_TYPES.includes(postType)) {
        postType = 'general';
      }
      if (comment) {
        return { comment, postType: postType || null };
      }
    } catch (_) {
      // fall through
    }
  }

  return { comment: text, postType: null };
}

globalThis.TONE_MAP = TONE_MAP;
globalThis.LENGTH_MAP = LENGTH_MAP;
globalThis.POST_TYPES = POST_TYPES;
globalThis.normalizeToneIds = normalizeToneIds;
globalThis.truncateAtSentence = truncateAtSentence;
globalThis.buildPrompt = buildPrompt;
globalThis.parseModelResponse = parseModelResponse;
