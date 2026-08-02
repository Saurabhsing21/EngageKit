/**
 * Content script: inject per-post Engage pill on the actor/header row + FAB.
 */

(function () {
  'use strict';

  const MSG = {
    OPEN_SIDEPANEL: 'OPEN_SIDEPANEL'
  };

  const INJECTED_ATTR =
    (globalThis.EngageSelectors && EngageSelectors.injectedAttr) ||
    'data-engage-injected';

  let observer = null;
  let toastTimer = null;

  function createPostIconButton() {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'engage-ext-post-btn engage-ext-post-btn--inline';
    btn.setAttribute('aria-label', 'Generate comment with EngageLens');
    btn.title = 'EngageLens — draft a comment';
    btn.innerHTML = `
      <span class="engage-ext-post-btn__icon" aria-hidden="true">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2l1.5 5.5L19 9l-5.5 1.5L12 16l-1.5-5.5L5 9l5.5-1.5L12 2z" fill="white"/>
          <path d="M18 14l.8 2.2L21 17l-2.2.8L18 20l-.8-2.2L15 17l2.2-.8L18 14z" fill="white"/>
        </svg>
      </span>
      <span class="engage-ext-post-btn__label">Engage</span>
    `;
    return btn;
  }

  function showToast(message) {
    let toast = document.getElementById('engage-ext-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'engage-ext-toast';
      toast.className = 'engage-ext-toast';
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add('engage-ext-toast--visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.classList.remove('engage-ext-toast--visible');
    }, 2800);
  }

  function openSidePanel(postText) {
    chrome.runtime.sendMessage(
      {
        type: MSG.OPEN_SIDEPANEL,
        postText: postText == null ? null : String(postText)
      },
      (response) => {
        if (chrome.runtime.lastError) {
          console.warn('[EngageLens]', chrome.runtime.lastError.message);
          showToast('Could not open EngageLens panel. Try the toolbar icon.');
          return;
        }
        if (response && response.error) {
          showToast(response.error);
        }
      }
    );
  }

  function mountEngageButton(postRoot, btn) {
    const info =
      typeof findActorHeaderMount === 'function'
        ? findActorHeaderMount(postRoot)
        : null;

    if (info && info.mount) {
      if (info.mode === 'before-menu' && info.menu && info.menu.parentElement) {
        info.menu.parentElement.insertBefore(btn, info.menu);
        return 'before-menu';
      }
      if (info.mode === 'slot' || info.mode === 'append') {
        info.mount.appendChild(btn);
        return info.mode;
      }
      info.mount.appendChild(btn);
      return 'header';
    }

    // Fallback: absolute on post card top-right
    btn.classList.remove('engage-ext-post-btn--inline');
    btn.classList.add('engage-ext-post-btn--absolute');
    postRoot.classList.add('engage-ext-post-root');
    postRoot.appendChild(btn);
    return 'absolute-fallback';
  }

  function injectIntoPost(postRoot) {
    if (!postRoot) return;
    if (typeof isShareBox === 'function' && isShareBox(postRoot)) return;
    if (typeof isValidPostCard === 'function' && !isValidPostCard(postRoot)) {
      return;
    }

    // Re-inject if marked but button missing (virtualization / failed mount)
    if (postRoot.getAttribute(INJECTED_ATTR) === 'true') {
      if (postRoot.querySelector('.engage-ext-post-btn')) return;
      postRoot.removeAttribute(INJECTED_ATTR);
    }

    postRoot.setAttribute(INJECTED_ATTR, 'true');

    const btn = createPostIconButton();
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();

      let text = '';
      try {
        if (typeof extractPostContent === 'function') {
          const result = await extractPostContent(postRoot);
          text = (result && result.text) || '';
        } else if (typeof extractPostText === 'function') {
          text = extractPostText(postRoot) || '';
        }
      } catch (err) {
        console.warn('[EngageLens] extract failed', err);
      }

      text = (text || '').trim();
      if (!text) {
        showToast("Can't read this post type yet.");
        openSidePanel(null);
        return;
      }

      openSidePanel(text);
    });

    mountEngageButton(postRoot, btn);
  }

  function scanAndInject(root) {
    if (typeof shouldInjectOnPage === 'function' && !shouldInjectOnPage()) return;
    if (typeof isFeedPresent === 'function' && !isFeedPresent()) return;

    // Remove Engage pills wrongly placed inside comment threads
    // Do NOT use [data-view-name*="comment"] — LinkedIn puts "comment" in main
    // post chrome (e.g. social commenting shell) and that deletes valid pills.
    try {
      document
        .querySelectorAll(
          '.comments-comment-item .engage-ext-post-btn, .comments-comments-list .engage-ext-post-btn, .comments-comment-entity .engage-ext-post-btn, .comments-comment-box .engage-ext-post-btn, [data-view-name="feed-comment"] .engage-ext-post-btn'
        )
        .forEach((btn) => btn.remove());
    } catch (_) {
      // skip
    }

    const posts =
      typeof queryPostRoots === 'function'
        ? queryPostRoots(root || document)
        : [];
    posts.forEach(injectIntoPost);
  }

  function ensureFab() {
    if (typeof shouldInjectOnPage === 'function' && !shouldInjectOnPage()) return;
    if (document.getElementById('engage-ext-fab')) return;

    const fab = document.createElement('button');
    fab.type = 'button';
    fab.id = 'engage-ext-fab';
    fab.className = 'engage-ext-fab';
    fab.setAttribute('aria-label', 'Open EngageLens');
    fab.title = 'Open EngageLens';
    fab.innerHTML = `
      <span class="engage-ext-fab__logo" aria-hidden="true">E</span>
      <span class="engage-ext-fab__text">EngageLens</span>
    `;
    fab.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      openSidePanel(null);
    });
    document.body.appendChild(fab);
  }

  function startObserver() {
    if (observer) return;
    if (typeof shouldInjectOnPage === 'function' && !shouldInjectOnPage()) return;
    const container =
      typeof findFeedContainer === 'function'
        ? findFeedContainer()
        : document.body;
    observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.addedNodes && m.addedNodes.length) {
          scanAndInject(container);
          break;
        }
      }
    });
    observer.observe(container, { childList: true, subtree: true });
  }

  function init() {
    if (typeof shouldInjectOnPage === 'function' && !shouldInjectOnPage()) return;
    ensureFab();
    scanAndInject(document);
    startObserver();

    let lastHref = location.href;
    setInterval(() => {
      if (location.href !== lastHref) {
        lastHref = location.href;
        if (!shouldInjectOnPage || shouldInjectOnPage()) {
          ensureFab();
          scanAndInject(document);
          startObserver();
        }
      }
    }, 1500);

    // Feed virtualization — periodic rescan so posts that were width=0
    // or remounted without a mutation still get an Engage button
    setTimeout(() => scanAndInject(document), 2000);
    let scrollTimer = null;
    window.addEventListener(
      'scroll',
      () => {
        clearTimeout(scrollTimer);
        scrollTimer = setTimeout(() => scanAndInject(document), 400);
      },
      { passive: true, capture: true }
    );
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
