/**
 * LinkedIn DOM selectors for EngageLens.
 *
 * LinkedIn (2026) uses hashed CSS class names — do NOT rely on classes.
 * Stable anchors from live DOM inspection:
 *   - Post card:   div[role="listitem"]
 *   - Author row:  header region with h2 + profile link (a[href*="/in/"] or /company/)
 *   - Actions:     button[aria-label*="Like"|"Comment"|"Repost"|"Send"]
 */

const EngageSelectors = {
  feedContainers: [
    '[data-testid="mainFeed"]',
    'main.scaffold-layout__main',
    '.scaffold-finite-scroll__content',
    'div[role="main"]'
  ],

  /** Post card roots — role=listitem is the stable 2026 shell */
  postRoots: [
    'div[role="listitem"]',
    '[data-view-name="feed-full-update"]',
    'div[data-id^="urn:li:activity"]',
    'div[data-id*="urn:li:activity"]',
    'div[data-urn^="urn:li:activity"]',
    'div[data-urn*="activity"]',
    'div.feed-shared-update-v2',
    'div.occludable-update'
  ],

  postBody: [
    '[data-testid="expandable-text-box"]',
    '[data-view-name="feed-commentary"]',
    '.feed-shared-update-v2__description',
    '.feed-shared-inline-show-more-text',
    '.update-components-text',
    'span[dir="ltr"].break-words'
  ],

  seeMore: [
    'button[aria-label*="see more"]',
    'button[aria-label*="See more"]',
    '.feed-shared-inline-show-more-text button'
  ],

  /** Comment-region markers — NEVER include the main Like/Comment/Repost bar */
  commentRegions: [
    '.comments-comment-item',
    '.comments-comments-list',
    '.comments-comment-entity',
    '.comments-comment-box',
    '.comments-comments-list__container',
    '[data-view-name="feed-comment"]',
    '.feed-shared-update-v2__comments-container'
  ],

  injectedAttr: 'data-engage-injected'
};

function commentRegionSelector() {
  return EngageSelectors.commentRegions.join(', ');
}

/** True if node lives inside a comment thread / reply UI. */
function isInsideComments(el) {
  if (!el || el.nodeType !== 1) return false;
  try {
    if (el.closest?.(commentRegionSelector())) return true;
  } catch (_) {
    // skip
  }
  // Heuristic: reply-only action rows
  try {
    const label = (el.getAttribute?.('aria-label') || '').toLowerCase();
    if (label.includes('reply')) return true;
  } catch (_) {
    // skip
  }
  return false;
}

function isShareBox(el) {
  if (!el || el.nodeType !== 1) return false;
  try {
    if (
      el.closest?.(
        '.share-box, .share-creation-state, [data-view-name="share-box"], .share-box-feed-entry'
      )
    ) {
      return true;
    }
  } catch (_) {
    // skip
  }
  const sample = (el.innerText || '').slice(0, 80).toLowerCase();
  return sample.includes('start a post');
}

/**
 * A feed post card (not a comment, not the share box).
 * Uses role=listitem + author (h2 or profile link). Actions preferred but optional.
 */
function isValidPostCard(el) {
  if (!el || el.nodeType !== 1) return false;
  if (isShareBox(el)) return false;
  if (isInsideComments(el)) return false;

  // Nested comment listitems
  if (el.getAttribute('role') === 'listitem') {
    const parentItem = el.parentElement?.closest?.('[role="listitem"]');
    if (parentItem && parentItem !== el) {
      // nested listitem is often a comment — skip
      if (isInsideComments(el) || el.querySelector?.('.comments-comment-item')) {
        return false;
      }
    }
  }

  let hasAuthor = false;
  try {
    const h2 = el.querySelector('h2');
    if (h2 && !isInsideComments(h2)) hasAuthor = true;
    if (!hasAuthor) {
      const links = el.querySelectorAll('a[href*="/in/"], a[href*="/company/"]');
      for (const a of links) {
        if (!isInsideComments(a)) {
          hasAuthor = true;
          break;
        }
      }
    }
  } catch (_) {
    return false;
  }
  if (!hasAuthor) return false;

  // Prefer cards that look like feed updates (have social actions OR substantial text)
  let hasMainActions = false;
  let hasBodyHint = false;
  try {
    const buttons = el.querySelectorAll('button');
    for (const btn of buttons) {
      if (isInsideComments(btn)) continue;
      const label = (btn.getAttribute('aria-label') || btn.textContent || '').toLowerCase();
      if (
        (label.includes('like') ||
          label.includes('react') ||
          label.includes('comment') ||
          label.includes('repost') ||
          label.includes('send')) &&
        !label.includes('reply')
      ) {
        hasMainActions = true;
        break;
      }
    }
    hasBodyHint = !!el.querySelector(
      '[data-testid="expandable-text-box"], [data-view-name="feed-commentary"], span[dir="ltr"]'
    );
  } catch (_) {
    // ignore
  }

  if (!hasMainActions && !hasBodyHint) return false;

  // Skip geometry checks when not laid out yet (virtualized feed → width/height 0).
  // Only reject clearly measured outliers (whole-feed shells), not tall image posts.
  const rect = el.getBoundingClientRect?.();
  if (rect && rect.width > 0 && rect.height > 0) {
    if (rect.width < 160) return false;
    const maxH = Math.max(3200, (window.innerHeight || 800) * 4);
    if (rect.height > maxH) return false;
  }

  return true;
}

function findPostRoot(node) {
  if (!node || node.nodeType !== 1) return null;
  if (isInsideComments(node)) return null;
  for (const sel of EngageSelectors.postRoots) {
    try {
      const match = node.closest?.(sel);
      if (match && isValidPostCard(match)) return match;
    } catch (_) {
      // skip
    }
  }
  return null;
}

function findPostRootFromActionButton(btn) {
  if (!btn) return null;
  if (isShareBox(btn) || isInsideComments(btn)) return null;

  let el = btn;
  let depth = 0;
  while (el && el !== document.body && depth < 16) {
    if (el.getAttribute?.('role') === 'listitem' && isValidPostCard(el)) {
      return el;
    }
    if (isValidPostCard(el)) return el;
    el = el.parentElement;
    depth += 1;
  }
  return null;
}

/** Prefer innermost valid cards. */
function dedupePostRoots(elements) {
  const list = Array.from(elements).filter(isValidPostCard);
  return list.filter((el) => !list.some((other) => other !== el && el.contains(other)));
}

function queryPostRoots(root) {
  const scope = root || document;
  const found = new Set();

  // Primary: role=listitem (stable per DevTools inspection)
  try {
    scope.querySelectorAll('div[role="listitem"]').forEach((el) => {
      if (isValidPostCard(el)) found.add(el);
    });
  } catch (_) {
    // skip
  }

  // Secondary: Like/Comment buttons → walk up (skip comments)
  try {
    const actionBtns = scope.querySelectorAll(
      'button[aria-label*="Comment"], button[aria-label*="Like"], button[aria-label*="Repost"], button[aria-label*="Send"]'
    );
    actionBtns.forEach((btn) => {
      const label = (btn.getAttribute('aria-label') || '').toLowerCase();
      if (label.includes('reply')) return;
      if (isInsideComments(btn) || isShareBox(btn)) return;
      const card = findPostRootFromActionButton(btn);
      if (card) found.add(card);
    });
  } catch (_) {
    // skip
  }

  // Tertiary: legacy attribute selectors
  for (const sel of EngageSelectors.postRoots) {
    if (sel === 'div[role="listitem"]') continue;
    try {
      scope.querySelectorAll(sel).forEach((el) => {
        if (isValidPostCard(el)) found.add(el);
      });
    } catch (_) {
      // skip
    }
  }

  return dedupePostRoots(found);
}

/**
 * Main post social action bar (Like/Comment/Repost/Send) — not reply buttons.
 */
function findMainSocialActionBar(postRoot) {
  if (!postRoot) return null;
  const buttons = postRoot.querySelectorAll('button');
  for (const btn of buttons) {
    if (isInsideComments(btn)) continue;
    const label = (btn.getAttribute('aria-label') || '').toLowerCase();
    if (label.includes('comment') && !label.includes('reply')) {
      return btn.parentElement?.parentElement || btn.parentElement;
    }
  }
  return null;
}

/**
 * Mount Engage on the ORIGINAL AUTHOR header row (h2 / profile), never in comments.
 * DOM hint: header div (~470x66) containing h2, child of role=listitem.
 */
function findActorHeaderMount(postRoot) {
  if (!postRoot) return null;

  const actionBar = findMainSocialActionBar(postRoot);

  const isInPostHeader = (el) => {
    if (!el || isInsideComments(el)) return false;
    if (actionBar) {
      // Must appear before the Like/Comment bar in document order
      const pos = el.compareDocumentPosition(actionBar);
      if (!(pos & Node.DOCUMENT_POSITION_FOLLOWING)) return false;
    }
    return true;
  };

  // 1) Control menu (⋯) on the post — same line as reference Engage
  try {
    const menus = postRoot.querySelectorAll(
      'button[aria-label*="Open control menu"], button[aria-label*="More actions"], button[aria-label*="control menu"], button[aria-label*="Dismiss"]'
    );
    for (const menu of menus) {
      if (!isInPostHeader(menu)) continue;
      const row = menu.parentElement;
      if (row) return { mount: row, mode: 'before-menu', menu };
    }
  } catch (_) {
    // skip
  }

  // 2) First h2 in the card that is above the action bar (author name)
  try {
    const headings = postRoot.querySelectorAll('h2');
    for (const h2 of headings) {
      if (!isInPostHeader(h2)) continue;
      // Climb to a row that holds name + optional Follow + menu
      let row = h2.parentElement;
      for (let i = 0; i < 5 && row && row !== postRoot; i++) {
        const rect = row.getBoundingClientRect?.();
        const wideEnough = rect && rect.width > 200 && rect.height < 120;
        if (wideEnough) {
          let slot = row.querySelector(':scope > .engage-ext-header-slot');
          if (!slot) {
            slot = document.createElement('div');
            slot.className = 'engage-ext-header-slot';
            row.appendChild(slot);
          }
          row.classList.add('engage-ext-actor-row');
          return { mount: slot, mode: 'slot', menu: null };
        }
        row = row.parentElement;
      }
    }
  } catch (_) {
    // skip
  }

  // 3) First non-comment Follow button above the action bar
  try {
    const buttons = postRoot.querySelectorAll('button');
    for (const btn of buttons) {
      if (!isInPostHeader(btn)) continue;
      const label = (btn.getAttribute('aria-label') || btn.textContent || '').trim();
      if (/^\+?\s*follow$/i.test(label)) {
        const row = btn.parentElement;
        if (row) return { mount: row, mode: 'append', menu: null };
      }
    }
  } catch (_) {
    // skip
  }

  // 4) First profile avatar/link above action bar
  try {
    const links = postRoot.querySelectorAll(
      'a[href*="/in/"], a[href*="/company/"], [data-view-name="feed-actor-image"]'
    );
    for (const link of links) {
      if (!isInPostHeader(link)) continue;
      let row = link.parentElement;
      for (let i = 0; i < 4 && row && row !== postRoot; i++) {
        const rect = row.getBoundingClientRect?.();
        if (rect && rect.width > 200 && rect.height < 120) {
          let slot = row.querySelector(':scope > .engage-ext-header-slot');
          if (!slot) {
            slot = document.createElement('div');
            slot.className = 'engage-ext-header-slot';
            row.appendChild(slot);
          }
          row.classList.add('engage-ext-actor-row');
          return { mount: slot, mode: 'slot', menu: null };
        }
        row = row.parentElement;
      }
      break; // only first author link
    }
  } catch (_) {
    // skip
  }

  return null;
}

function findPostHeader(postRoot) {
  return findActorHeaderMount(postRoot)?.mount || null;
}

function findActionBar(postRoot) {
  return findMainSocialActionBar(postRoot);
}

function expandSeeMore(postRoot) {
  if (!postRoot) return false;
  for (const sel of EngageSelectors.seeMore) {
    try {
      const nodes = postRoot.querySelectorAll(sel);
      for (const btn of nodes) {
        if (isInsideComments(btn)) continue;
        const label = (btn.getAttribute('aria-label') || btn.textContent || '').toLowerCase();
        if (label.includes('less') && !label.includes('more')) continue;
        if (label.includes('more') || /…\s*more|see more/i.test(btn.textContent || '')) {
          btn.click();
          return true;
        }
      }
    } catch (_) {
      // skip
    }
  }
  return false;
}

function cleanPostText(raw) {
  if (!raw) return '';
  return String(raw)
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^\s*hashtag\s+/gi, '')
    .trim();
}

function extractPostText(postRoot) {
  if (!postRoot) return '';

  const chunks = [];
  const seen = new Set();

  for (const sel of EngageSelectors.postBody) {
    let nodes = [];
    try {
      nodes = Array.from(postRoot.querySelectorAll(sel));
    } catch (_) {
      continue;
    }

    for (const node of nodes) {
      if (isInsideComments(node)) continue;
      const text = cleanPostText(node.innerText || node.textContent || '');
      if (!text) continue;
      if (seen.has(text)) continue;
      let contained = false;
      for (const existing of seen) {
        if (existing.includes(text) && existing.length > text.length) {
          contained = true;
          break;
        }
      }
      if (contained) continue;
      for (const existing of Array.from(seen)) {
        if (text.includes(existing) && text.length > existing.length) {
          seen.delete(existing);
          const idx = chunks.indexOf(existing);
          if (idx >= 0) chunks.splice(idx, 1);
        }
      }
      seen.add(text);
      chunks.push(text);
    }
  }

  if (chunks.length) {
    chunks.sort((a, b) => b.length - a.length);
    const primary = chunks[0];
    const extras = chunks.slice(1).filter((c) => !primary.includes(c));
    return [primary, ...extras].join('\n\n').trim();
  }

  // Fallback: longest non-comment dir=ltr block above action bar
  try {
    const spans = postRoot.querySelectorAll('span[dir="ltr"]');
    let best = '';
    for (const span of spans) {
      if (isInsideComments(span)) continue;
      const t = cleanPostText(span.innerText || '');
      if (t.length > best.length) best = t;
    }
    return best;
  } catch (_) {
    return '';
  }
}

async function extractPostContent(postRoot) {
  const expanded = expandSeeMore(postRoot);
  if (expanded) {
    await new Promise((r) => setTimeout(r, 150));
  }
  return { text: extractPostText(postRoot), expanded };
}

function findFeedContainer() {
  for (const sel of EngageSelectors.feedContainers) {
    try {
      const el = document.querySelector(sel);
      if (el) return el;
    } catch (_) {
      // skip
    }
  }
  return document.body;
}

function isFeedPresent() {
  return (
    queryPostRoots(document).length > 0 ||
    !!document.querySelector('div[role="listitem"], [data-testid="mainFeed"], main.scaffold-layout__main')
  );
}

function shouldInjectOnPage() {
  const path = location.pathname || '';
  if (path.startsWith('/feed') || path === '/' || path.startsWith('/recent-activity')) {
    return true;
  }
  return isFeedPresent();
}

globalThis.EngageSelectors = EngageSelectors;
globalThis.isInsideComments = isInsideComments;
globalThis.findPostRoot = findPostRoot;
globalThis.findPostRootFromActionButton = findPostRootFromActionButton;
globalThis.isValidPostCard = isValidPostCard;
globalThis.isShareBox = isShareBox;
globalThis.queryPostRoots = queryPostRoots;
globalThis.findActorHeaderMount = findActorHeaderMount;
globalThis.findPostHeader = findPostHeader;
globalThis.findActionBar = findActionBar;
globalThis.findMainSocialActionBar = findMainSocialActionBar;
globalThis.expandSeeMore = expandSeeMore;
globalThis.extractPostText = extractPostText;
globalThis.extractPostContent = extractPostContent;
globalThis.findFeedContainer = findFeedContainer;
globalThis.isFeedPresent = isFeedPresent;
globalThis.shouldInjectOnPage = shouldInjectOnPage;
