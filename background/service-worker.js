// =============================================================================
// SynActivity — Background Service Worker v1.2.0
// 100% local. No network calls. No external dependencies.
// =============================================================================

// ─── Category Map ─────────────────────────────────────────────────────────────
const CATEGORY_MAP = {
  // Social
  'youtube.com': 'Social', 'twitter.com': 'Social', 'x.com': 'Social',
  'instagram.com': 'Social', 'facebook.com': 'Social', 'reddit.com': 'Social',
  'linkedin.com': 'Social', 'tiktok.com': 'Social', 'pinterest.com': 'Social',
  'snapchat.com': 'Social', 'discord.com': 'Social', 'telegram.org': 'Social',
  'whatsapp.com': 'Social',

  // Development
  'github.com': 'Development', 'stackoverflow.com': 'Development',
  'gitlab.com': 'Development', 'bitbucket.org': 'Development',
  'codepen.io': 'Development', 'replit.com': 'Development',
  'npmjs.com': 'Development', 'developer.mozilla.org': 'Development',
  'docs.python.org': 'Development', 'pypi.org': 'Development',
  'codesandbox.io': 'Development', 'jsfiddle.net': 'Development',
  'leetcode.com': 'Development', 'hackerrank.com': 'Development',
  'codeforces.com': 'Development', 'vercel.com': 'Development',
  'netlify.com': 'Development', 'heroku.com': 'Development',
  'docker.com': 'Development', 'kubernetes.io': 'Development',
  'aws.amazon.com': 'Development', 'console.cloud.google.com': 'Development',
  'azure.microsoft.com': 'Development', 'dev.to': 'Development',
  'medium.com': 'Development', 'hashnode.com': 'Development',

  // Entertainment
  'netflix.com': 'Entertainment', 'spotify.com': 'Entertainment',
  'twitch.tv': 'Entertainment', 'primevideo.com': 'Entertainment',
  'hulu.com': 'Entertainment', 'disneyplus.com': 'Entertainment',
  'soundcloud.com': 'Entertainment', 'hbomax.com': 'Entertainment',
  'max.com': 'Entertainment', 'peacocktv.com': 'Entertainment',
  'crunchyroll.com': 'Entertainment',

  // Productivity
  'notion.so': 'Productivity', 'docs.google.com': 'Productivity',
  'sheets.google.com': 'Productivity', 'slides.google.com': 'Productivity',
  'figma.com': 'Productivity', 'trello.com': 'Productivity',
  'asana.com': 'Productivity', 'monday.com': 'Productivity',
  'airtable.com': 'Productivity', 'miro.com': 'Productivity',
  'todoist.com': 'Productivity', 'calendar.google.com': 'Productivity',
  'gmail.com': 'Productivity', 'mail.google.com': 'Productivity',
  'drive.google.com': 'Productivity', 'dropbox.com': 'Productivity',
  'confluence.com': 'Productivity', 'jira.com': 'Productivity',
  'atlassian.com': 'Productivity', 'linear.app': 'Productivity',
  'clickup.com': 'Productivity', 'obsidian.md': 'Productivity',
  'roamresearch.com': 'Productivity', 'evernote.com': 'Productivity',

  // Search
  'google.com': 'Search', 'bing.com': 'Search', 'duckduckgo.com': 'Search',
  'yahoo.com': 'Search', 'ecosia.org': 'Search', 'brave.com': 'Search',

  // AI
  'chatgpt.com': 'AI', 'claude.ai': 'AI', 'gemini.google.com': 'AI',
  'perplexity.ai': 'AI', 'bard.google.com': 'AI',
  'copilot.microsoft.com': 'AI', 'poe.com': 'AI',
  'huggingface.co': 'AI', 'cohere.com': 'AI', 'mistral.ai': 'AI',

  // News
  'news.ycombinator.com': 'News', 'techcrunch.com': 'News',
  'theverge.com': 'News', 'bbc.com': 'News', 'cnn.com': 'News',
  'nytimes.com': 'News', 'wired.com': 'News', 'arstechnica.com': 'News',
  'thenextweb.com': 'News',
};

// ─── Async Mutex ──────────────────────────────────────────────────────────────
// Ensures all session operations are serialised — no two handlers can
// interleave their await chains and double-count the same seconds.
let _lock = Promise.resolve();
function withLock(fn) {
  _lock = _lock.then(() => fn()).catch(() => {});
  return _lock;
}

// ─── Pure Helpers ─────────────────────────────────────────────────────────────

function getCategory(hostname, customCategories = {}) {
  if (customCategories[hostname]) return customCategories[hostname];
  if (CATEGORY_MAP[hostname])     return CATEGORY_MAP[hostname];
  const parts = hostname.split('.');
  for (let i = 1; i < parts.length - 1; i++) {
    const candidate = parts.slice(i).join('.');
    if (CATEGORY_MAP[candidate]) return CATEGORY_MAP[candidate];
  }
  return 'Other';
}

function getLocalDateString(d = new Date()) {
  const year  = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day   = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getToday() { return getLocalDateString(new Date()); }

function extractHostname(url) {
  if (!url) return null;
  if (url.startsWith('chrome://') || url.startsWith('chrome-extension://') ||
      url.startsWith('about:')    || url.startsWith('edge://') ||
      url.startsWith('devtools://')) return null;
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return null; }
}

// ─── Storage ──────────────────────────────────────────────────────────────────

async function getCurrentState() {
  return chrome.storage.session.get({
    hostname:      null,
    startTime:     null,
    lastHeartbeat: null,
    isTracking:    false,
    chromeFocused: true,
    userIdle:      false,
  });
}

/**
 * Persist `elapsedSeconds` for `hostname` under the local date that
 * corresponds to `chunkStartTime` (so midnight-crossing is handled correctly).
 */
async function addTimeToStorage(hostname, elapsedSeconds, chunkStartTime) {
  if (!hostname || elapsedSeconds < 1) return;

  const { customCategories = {} } = await chrome.storage.local.get({ customCategories: {} });
  const dateKey = `day_${getLocalDateString(new Date(chunkStartTime))}`;
  const stored  = await chrome.storage.local.get({ [dateKey]: {} });
  const sites   = stored[dateKey] || {};

  if (!sites[hostname]) {
    sites[hostname] = {
      totalSeconds: 0,
      visits:       0,
      firstVisit:   chunkStartTime,
      lastVisit:    chunkStartTime,
      category:     getCategory(hostname, customCategories),
    };
  }

  sites[hostname].totalSeconds += elapsedSeconds;
  sites[hostname].lastVisit    = Date.now();

  await chrome.storage.local.set({ [dateKey]: sites });
}

// ─── Core Session Primitives (must be called inside withLock) ─────────────────

/**
 * Calculate how many seconds to credit for the current open chunk,
 * applying the sleep-gap cap if the system was suspended.
 * Returns 0 if there is nothing to commit.
 */
function _calcElapsed(state) {
  if (!state.isTracking || !state.startTime) return 0;

  const now           = Date.now();
  const lastHeartbeat = state.lastHeartbeat || state.startTime;
  const gapMs         = now - lastHeartbeat;

  if (gapMs > 120_000) {
    // Gap > 2 min means sleep/hibernate.  Only credit the time before the gap.
    return Math.min(90, Math.max(0, Math.floor((lastHeartbeat - state.startTime) / 1000)));
  }
  return Math.max(0, Math.floor((now - state.startTime) / 1000));
}

/**
 * Save the current chunk's elapsed time and clear the chunk markers.
 * Leaves isTracking / hostname / chromeFocused / userIdle unchanged.
 */
async function _commitChunk(state) {
  const elapsed = _calcElapsed(state);
  if (elapsed >= 1) {
    await addTimeToStorage(state.hostname, elapsed, state.startTime);
  }
  await chrome.storage.session.set({ startTime: null, lastHeartbeat: null });
}

/**
 * Heartbeat flush: save elapsed time and restart the chunk from now.
 */
async function _flush() {
  const state = await getCurrentState();
  if (!state.isTracking || !state.hostname || !state.startTime) return;

  const now           = Date.now();
  const lastHeartbeat = state.lastHeartbeat || state.startTime;
  const gapMs         = now - lastHeartbeat;

  if (gapMs > 120_000) {
    // System was asleep — save only pre-gap time, then reset from now.
    const preGap = Math.min(90, Math.max(0, Math.floor((lastHeartbeat - state.startTime) / 1000)));
    if (preGap >= 1) await addTimeToStorage(state.hostname, preGap, state.startTime);
    await chrome.storage.session.set({ startTime: now, lastHeartbeat: now });
    return;
  }

  const elapsed = Math.max(0, Math.floor((now - state.startTime) / 1000));
  if (elapsed >= 1) await addTimeToStorage(state.hostname, elapsed, state.startTime);

  // Restart the chunk from now so the next flush only measures new time.
  await chrome.storage.session.set({ startTime: now, lastHeartbeat: now });
}

/**
 * Switch to a new hostname (or stop if newHostname is null).
 * overrides: partial state fields to apply (e.g. { chromeFocused: false }).
 */
async function _transition(newHostname, overrides = {}) {
  const state = await getCurrentState();
  await _commitChunk(state);

  const next = { ...state, ...overrides };

  const { trackingEnabled = true } = await chrome.storage.local.get({ trackingEnabled: true });
  const shouldTrack = newHostname && next.chromeFocused && !next.userIdle && trackingEnabled;

  if (shouldTrack) {
    const now     = Date.now();
    const dateKey = `day_${getLocalDateString(new Date(now))}`;
    const { customCategories = {} } = await chrome.storage.local.get({ customCategories: {} });
    const stored  = await chrome.storage.local.get({ [dateKey]: {} });
    const sites   = stored[dateKey] || {};

    const isNew = !sites[newHostname];
    if (isNew) {
      sites[newHostname] = {
        totalSeconds: 0, visits: 0,
        firstVisit: now, lastVisit: now,
        category: getCategory(newHostname, customCategories),
      };
    }

    // Only increment visit count when navigating TO a different site.
    if (newHostname !== state.hostname || isNew) {
      sites[newHostname].visits += 1;
    }
    sites[newHostname].lastVisit = now;
    await chrome.storage.local.set({ [dateKey]: sites });

    await chrome.storage.session.set({
      ...next,
      hostname:      newHostname,
      startTime:     now,
      lastHeartbeat: now,
      isTracking:    true,
    });
  } else {
    await chrome.storage.session.set({
      ...next,
      hostname:      newHostname || null,
      startTime:     null,
      lastHeartbeat: null,
      isTracking:    false,
    });
  }
}

/** Pause tracking (commit chunk, clear timer, apply state overrides). */
async function _pause(overrides = {}) {
  const state = await getCurrentState();
  await _commitChunk(state);
  await chrome.storage.session.set({
    ...state,
    ...overrides,
    startTime:     null,
    lastHeartbeat: null,
    isTracking:    false,
  });
}

// ─── Active tab helper ────────────────────────────────────────────────────────

async function getActiveTabHostname() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    return tab ? extractHostname(tab.url) : null;
  } catch { return null; }
}

// ─── Event Listeners ──────────────────────────────────────────────────────────

chrome.tabs.onActivated.addListener((activeInfo) => {
  withLock(async () => {
    try {
      const tab = await chrome.tabs.get(activeInfo.tabId);
      await _transition(extractHostname(tab.url));
    } catch { /* tab was closed immediately */ }
  });
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'complete' || !tab.active) return;
  withLock(async () => {
    const state    = await getCurrentState();
    const hostname = extractHostname(tab.url);
    // Only transition when the hostname actually changed.
    if (hostname !== state.hostname) await _transition(hostname);
  });
});

chrome.tabs.onRemoved.addListener(() => {
  withLock(async () => {
    await new Promise(r => setTimeout(r, 60));
    await _transition(await getActiveTabHostname());
  });
});

chrome.windows.onFocusChanged.addListener((windowId) => {
  withLock(async () => {
    if (windowId === chrome.windows.WINDOW_ID_NONE) {
      await _pause({ chromeFocused: false });
    } else {
      await _transition(await getActiveTabHostname(), { chromeFocused: true });
    }
  });
});

chrome.idle.onStateChanged.addListener((idleState) => {
  withLock(async () => {
    if (idleState === 'idle' || idleState === 'locked') {
      await _pause({ userIdle: true });
    } else if (idleState === 'active') {
      await _transition(await getActiveTabHostname(), { userIdle: false });
    }
  });
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name !== 'heartbeat') return;
  withLock(() => _flush());
});

chrome.runtime.onSuspend.addListener(() => {
  withLock(async () => {
    const state = await getCurrentState();
    await _commitChunk(state);
    await chrome.storage.session.set({ ...state, startTime: null, lastHeartbeat: null, isTracking: false });
  });
});

// ─── Initialization ───────────────────────────────────────────────────────────

async function _ensureAlarmAndIdle() {
  const { idleThresholdSeconds = 60 } = await chrome.storage.local.get({ idleThresholdSeconds: 60 });
  chrome.idle.setDetectionInterval(idleThresholdSeconds);
  const existing = await chrome.alarms.get('heartbeat');
  if (!existing) chrome.alarms.create('heartbeat', { periodInMinutes: 1 });
}

chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    await chrome.storage.local.set({ trackingEnabled: true, idleThresholdSeconds: 60, customCategories: {} });
  }
  await _ensureAlarmAndIdle();
});

chrome.runtime.onStartup.addListener(async () => {
  await _ensureAlarmAndIdle();

  // Clear ephemeral chunk state — startTime from the previous session is invalid.
  await chrome.storage.session.set({
    hostname: null, startTime: null, lastHeartbeat: null,
    isTracking: false, chromeFocused: true, userIdle: false,
  });

  withLock(async () => {
    await _transition(await getActiveTabHostname());
  });
});

// ─── Message Handler ──────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  (async () => {
    switch (message.type) {

      case 'GET_STATUS': {
        const [state, settings] = await Promise.all([
          getCurrentState(),
          chrome.storage.local.get({ trackingEnabled: true, idleThresholdSeconds: 60 }),
        ]);
        sendResponse({ state, ...settings });
        break;
      }

      case 'SET_TRACKING': {
        await chrome.storage.local.set({ trackingEnabled: message.enabled });
        await withLock(async () => {
          if (!message.enabled) {
            await _pause();
          } else {
            await _transition(await getActiveTabHostname());
          }
        });
        sendResponse({ ok: true });
        break;
      }

      case 'SET_IDLE_THRESHOLD': {
        const seconds = Math.max(15, Math.min(300, Number(message.seconds)));
        await chrome.storage.local.set({ idleThresholdSeconds: seconds });
        chrome.idle.setDetectionInterval(seconds);
        sendResponse({ ok: true });
        break;
      }

      case 'GET_TODAY': {
        const dateKey = `day_${getToday()}`;
        const stored  = await chrome.storage.local.get({ [dateKey]: {} });
        const sites   = JSON.parse(JSON.stringify(stored[dateKey] || {}));

        // Add the live un-flushed chunk so the UI reflects real-time activity.
        const state = await getCurrentState();
        if (state.isTracking && state.hostname && state.startTime) {
          const now           = Date.now();
          const lastHeartbeat = state.lastHeartbeat || state.startTime;
          if (now - lastHeartbeat <= 120_000) {
            const partial = Math.floor((now - state.startTime) / 1000);
            if (partial > 0) {
              if (!sites[state.hostname]) {
                const { customCategories = {} } = await chrome.storage.local.get({ customCategories: {} });
                sites[state.hostname] = {
                  totalSeconds: partial, visits: 1,
                  firstVisit: state.startTime, lastVisit: now,
                  category: getCategory(state.hostname, customCategories),
                };
              } else {
                sites[state.hostname].totalSeconds += partial;
              }
            }
          }
        }
        sendResponse({ sites });
        break;
      }

      case 'GET_RANGE': {
        const days     = Math.max(1, Math.min(365, Number(message.days) || 7));
        const allSites = {};
        const base     = new Date();

        for (let i = 0; i < days; i++) {
          const d      = new Date(base);
          d.setDate(d.getDate() - i);
          const key    = `day_${getLocalDateString(d)}`;
          const stored = await chrome.storage.local.get({ [key]: {} });

          for (const [host, s] of Object.entries(stored[key] || {})) {
            if (!allSites[host]) {
              allSites[host] = { totalSeconds: 0, visits: 0, firstVisit: s.firstVisit, lastVisit: s.lastVisit, category: s.category };
            }
            allSites[host].totalSeconds += s.totalSeconds || 0;
            allSites[host].visits       += s.visits       || 0;
            allSites[host].lastVisit     = Math.max(allSites[host].lastVisit  || 0, s.lastVisit  || 0);
            allSites[host].firstVisit    = Math.min(allSites[host].firstVisit || Infinity, s.firstVisit || Infinity);
          }
        }

        // Merge live chunk.
        const state = await getCurrentState();
        if (state.isTracking && state.hostname && state.startTime) {
          const nowMs         = Date.now();
          const lastHeartbeat = state.lastHeartbeat || state.startTime;
          if (nowMs - lastHeartbeat <= 120_000) {
            const partial = Math.floor((nowMs - state.startTime) / 1000);
            if (partial > 0) {
              if (!allSites[state.hostname]) {
                const { customCategories = {} } = await chrome.storage.local.get({ customCategories: {} });
                allSites[state.hostname] = {
                  totalSeconds: partial, visits: 1,
                  firstVisit: state.startTime, lastVisit: nowMs,
                  category: getCategory(state.hostname, customCategories),
                };
              } else {
                allSites[state.hostname].totalSeconds += partial;
              }
            }
          }
        }
        sendResponse({ sites: allSites });
        break;
      }

      case 'GET_ALL_KEYS': {
        const all = await chrome.storage.local.get(null);
        sendResponse({ keys: Object.keys(all).filter(k => k.startsWith('day_')).sort() });
        break;
      }

      case 'GET_DAILY_BREAKDOWN': {
        const days   = Math.max(1, Math.min(90, Number(message.days) || 7));
        const result = [];
        const base   = new Date();

        for (let i = days - 1; i >= 0; i--) {
          const d       = new Date(base);
          d.setDate(d.getDate() - i);
          const dateStr = getLocalDateString(d);
          const stored  = await chrome.storage.local.get({ [`day_${dateStr}`]: {} });
          const total   = Object.values(stored[`day_${dateStr}`] || {}).reduce(
            (sum, s) => sum + (s.totalSeconds || 0), 0
          );
          result.push({ date: dateStr, totalSeconds: total });
        }
        sendResponse({ days: result });
        break;
      }

      case 'CLEAR_ALL_DATA': {
        const all     = await chrome.storage.local.get(null);
        const dayKeys = Object.keys(all).filter(k => k.startsWith('day_'));
        await chrome.storage.local.remove(dayKeys);
        await chrome.storage.session.set({
          hostname: null, startTime: null, lastHeartbeat: null,
          isTracking: false, chromeFocused: true, userIdle: false,
        });
        sendResponse({ ok: true });
        break;
      }

      case 'CLEAR_SITE': {
        const dateKey = `day_${getToday()}`;
        const stored  = await chrome.storage.local.get({ [dateKey]: {} });
        if (stored[dateKey] && message.hostname) {
          delete stored[dateKey][message.hostname];
          await chrome.storage.local.set({ [dateKey]: stored[dateKey] });
        }
        sendResponse({ ok: true });
        break;
      }

      default:
        sendResponse({ error: 'Unknown message type' });
    }
  })();
  return true;
});


