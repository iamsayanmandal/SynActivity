// =============================================================================
// SynActivity — Background Service Worker
// 100% local. No network calls. No external dependencies.
// =============================================================================

// ─── Category Map ─────────────────────────────────────────────────────────────
const CATEGORY_MAP = {
  // Social
  'youtube.com': 'Social',
  'twitter.com': 'Social',
  'x.com': 'Social',
  'instagram.com': 'Social',
  'facebook.com': 'Social',
  'reddit.com': 'Social',
  'linkedin.com': 'Social',
  'tiktok.com': 'Social',
  'pinterest.com': 'Social',
  'snapchat.com': 'Social',
  'discord.com': 'Social',
  'telegram.org': 'Social',
  'whatsapp.com': 'Social',

  // Development
  'github.com': 'Development',
  'stackoverflow.com': 'Development',
  'gitlab.com': 'Development',
  'bitbucket.org': 'Development',
  'codepen.io': 'Development',
  'replit.com': 'Development',
  'npmjs.com': 'Development',
  'developer.mozilla.org': 'Development',
  'docs.python.org': 'Development',
  'pypi.org': 'Development',
  'codesandbox.io': 'Development',
  'jsfiddle.net': 'Development',
  'leetcode.com': 'Development',
  'hackerrank.com': 'Development',
  'codeforces.com': 'Development',
  'vercel.com': 'Development',
  'netlify.com': 'Development',
  'heroku.com': 'Development',
  'docker.com': 'Development',
  'kubernetes.io': 'Development',
  'aws.amazon.com': 'Development',
  'console.cloud.google.com': 'Development',
  'azure.microsoft.com': 'Development',
  'dev.to': 'Development',
  'medium.com': 'Development',
  'hashnode.com': 'Development',

  // Entertainment
  'netflix.com': 'Entertainment',
  'spotify.com': 'Entertainment',
  'twitch.tv': 'Entertainment',
  'primevideo.com': 'Entertainment',
  'hulu.com': 'Entertainment',
  'disneyplus.com': 'Entertainment',
  'soundcloud.com': 'Entertainment',
  'hbomax.com': 'Entertainment',
  'max.com': 'Entertainment',
  'peacocktv.com': 'Entertainment',
  'crunchyroll.com': 'Entertainment',

  // Productivity
  'notion.so': 'Productivity',
  'docs.google.com': 'Productivity',
  'sheets.google.com': 'Productivity',
  'slides.google.com': 'Productivity',
  'figma.com': 'Productivity',
  'trello.com': 'Productivity',
  'asana.com': 'Productivity',
  'monday.com': 'Productivity',
  'airtable.com': 'Productivity',
  'miro.com': 'Productivity',
  'todoist.com': 'Productivity',
  'calendar.google.com': 'Productivity',
  'gmail.com': 'Productivity',
  'mail.google.com': 'Productivity',
  'drive.google.com': 'Productivity',
  'dropbox.com': 'Productivity',
  'confluence.com': 'Productivity',
  'jira.com': 'Productivity',
  'atlassian.com': 'Productivity',
  'linear.app': 'Productivity',
  'clickup.com': 'Productivity',
  'obsidian.md': 'Productivity',
  'roamresearch.com': 'Productivity',
  'evernote.com': 'Productivity',

  // Search
  'google.com': 'Search',
  'bing.com': 'Search',
  'duckduckgo.com': 'Search',
  'yahoo.com': 'Search',
  'ecosia.org': 'Search',
  'brave.com': 'Search',

  // AI
  'chatgpt.com': 'AI',
  'claude.ai': 'AI',
  'gemini.google.com': 'AI',
  'perplexity.ai': 'AI',
  'bard.google.com': 'AI',
  'copilot.microsoft.com': 'AI',
  'poe.com': 'AI',
  'huggingface.co': 'AI',
  'cohere.com': 'AI',
  'mistral.ai': 'AI',

  // News
  'news.ycombinator.com': 'News',
  'techcrunch.com': 'News',
  'theverge.com': 'News',
  'bbc.com': 'News',
  'cnn.com': 'News',
  'nytimes.com': 'News',
  'wired.com': 'News',
  'arstechnica.com': 'News',
  'thenextweb.com': 'News',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getCategory(hostname, customCategories = {}) {
  if (customCategories[hostname]) return customCategories[hostname];
  if (CATEGORY_MAP[hostname]) return CATEGORY_MAP[hostname];

  // Subdomain fallback: news.google.com → google.com
  const parts = hostname.split('.');
  for (let i = 1; i < parts.length - 1; i++) {
    const candidate = parts.slice(i).join('.');
    if (CATEGORY_MAP[candidate]) return CATEGORY_MAP[candidate];
  }
  return 'Other';
}

function getToday() {
  return new Date().toISOString().split('T')[0];
}

function extractHostname(url) {
  if (!url) return null;
  if (
    url.startsWith('chrome://') ||
    url.startsWith('chrome-extension://') ||
    url.startsWith('about:') ||
    url.startsWith('edge://') ||
    url.startsWith('devtools://')
  ) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

// ─── Storage Helpers ──────────────────────────────────────────────────────────

/** Read the current ephemeral tracking state (survives SW restart). */
async function getCurrentState() {
  return chrome.storage.session.get({
    hostname: null,
    startTime: null,
    isTracking: false,
    chromeFocused: true,
    userIdle: false,
  });
}

/** Write partial elapsed time for the current session without ending it. */
async function flushPartialSession(state) {
  if (!state.isTracking || !state.hostname || !state.startTime) return;

  const elapsed = Math.floor((Date.now() - state.startTime) / 1000);
  if (elapsed < 1) return;

  const dayKey = `day_${getToday()}`;
  const stored = await chrome.storage.local.get({ [dayKey]: {} });
  const sites = stored[dayKey];

  if (sites[state.hostname]) {
    sites[state.hostname].totalSeconds += elapsed;
    sites[state.hostname].lastVisit = Date.now();
    await chrome.storage.local.set({ [dayKey]: sites });
  }

  // Reset startTime so we don't double-count
  await chrome.storage.session.set({ startTime: Date.now() });
}

/** Stop the current session — compute elapsed and persist it. */
async function stopSession(state) {
  if (!state.hostname || !state.startTime || !state.isTracking) return;

  const elapsed = Math.floor((Date.now() - state.startTime) / 1000);
  if (elapsed < 1) return;

  const { customCategories = {} } = await chrome.storage.local.get({ customCategories: {} });
  const dayKey = `day_${getToday()}`;
  const stored = await chrome.storage.local.get({ [dayKey]: {} });
  const sites = stored[dayKey];

  if (!sites[state.hostname]) {
    sites[state.hostname] = {
      totalSeconds: 0,
      visits: 0,
      firstVisit: state.startTime,
      lastVisit: Date.now(),
      category: getCategory(state.hostname, customCategories),
    };
  }

  sites[state.hostname].totalSeconds += elapsed;
  sites[state.hostname].lastVisit = Date.now();

  await chrome.storage.local.set({ [dayKey]: sites });
}

/**
 * Stop the previous session and begin a new one on `hostname`.
 * If hostname is null or conditions aren't met, just stops.
 */
async function startSession(hostname, currentState) {
  await stopSession(currentState);

  const shouldStart = hostname && currentState.chromeFocused && !currentState.userIdle;

  if (shouldStart) {
    const { trackingEnabled = true } = await chrome.storage.local.get({ trackingEnabled: true });
    if (!trackingEnabled) {
      await chrome.storage.session.set({
        ...currentState,
        hostname,
        startTime: null,
        isTracking: false,
      });
      return;
    }

    // Record visit count + firstVisit if new
    const { customCategories = {} } = await chrome.storage.local.get({ customCategories: {} });
    const dayKey = `day_${getToday()}`;
    const stored = await chrome.storage.local.get({ [dayKey]: {} });
    const sites = stored[dayKey];

    if (!sites[hostname]) {
      sites[hostname] = {
        totalSeconds: 0,
        visits: 0,
        firstVisit: Date.now(),
        lastVisit: Date.now(),
        category: getCategory(hostname, customCategories),
      };
    }

    // Only count as a visit if it's a different hostname than previous
    if (hostname !== currentState.hostname) {
      sites[hostname].visits += 1;
    }
    sites[hostname].lastVisit = Date.now();
    await chrome.storage.local.set({ [dayKey]: sites });

    await chrome.storage.session.set({
      ...currentState,
      hostname,
      startTime: Date.now(),
      isTracking: true,
    });
  } else {
    await chrome.storage.session.set({
      ...currentState,
      hostname: hostname || null,
      startTime: null,
      isTracking: false,
    });
  }
}

/** Get the hostname of the currently active, focused tab. */
async function getActiveTabHostname() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    return tab ? extractHostname(tab.url) : null;
  } catch {
    return null;
  }
}

// ─── Event Listeners (must all be registered synchronously at top level) ──────

/** Active tab switched */
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    const [state, tab] = await Promise.all([
      getCurrentState(),
      chrome.tabs.get(activeInfo.tabId),
    ]);
    const hostname = extractHostname(tab.url);
    await startSession(hostname, state);
  } catch {
    // Tab may have been closed immediately
  }
});

/** Tab URL changed (navigation within a tab) */
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'complete') return;
  if (!tab.active) return;

  const state = await getCurrentState();
  const hostname = extractHostname(tab.url);

  // Only transition if hostname actually changed
  if (hostname !== state.hostname) {
    await startSession(hostname, state);
  }
});

/** Tab closed — find new active tab */
chrome.tabs.onRemoved.addListener(async (tabId, removeInfo) => {
  const state = await getCurrentState();
  if (!state.isTracking) return;

  // Give Chrome a tick to update the active tab
  await new Promise(r => setTimeout(r, 50));
  const hostname = await getActiveTabHostname();
  await startSession(hostname, state);
});

/** Chrome window focus changed */
chrome.windows.onFocusChanged.addListener(async (windowId) => {
  const state = await getCurrentState();

  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    // Chrome lost focus entirely
    await stopSession(state);
    await chrome.storage.session.set({
      ...state,
      chromeFocused: false,
      startTime: null,
      isTracking: false,
    });
  } else {
    // Chrome gained focus
    const hostname = await getActiveTabHostname();
    const newState = { ...state, chromeFocused: true };
    await startSession(hostname, newState);
  }
});

/** System idle state changed */
chrome.idle.onStateChanged.addListener(async (idleState) => {
  const state = await getCurrentState();

  if (idleState === 'idle' || idleState === 'locked') {
    await stopSession(state);
    await chrome.storage.session.set({
      ...state,
      userIdle: true,
      startTime: null,
      isTracking: false,
    });
  } else if (idleState === 'active') {
    const hostname = await getActiveTabHostname();
    const newState = { ...state, userIdle: false };
    await startSession(hostname, newState);
  }
});

/** Heartbeat alarm — saves partial session every minute so data isn't lost if Chrome crashes */
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== 'heartbeat') return;
  const state = await getCurrentState();
  await flushPartialSession(state);
});

// ─── Initialization ───────────────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    await chrome.storage.local.set({
      trackingEnabled: true,
      idleThresholdSeconds: 60,
      customCategories: {},
    });
  }

  chrome.idle.setDetectionInterval(60);

  const existing = await chrome.alarms.get('heartbeat');
  if (!existing) {
    await chrome.alarms.create('heartbeat', { periodInMinutes: 1 });
  }
});

chrome.runtime.onStartup.addListener(async () => {
  chrome.idle.setDetectionInterval(60);

  const existing = await chrome.alarms.get('heartbeat');
  if (!existing) {
    await chrome.alarms.create('heartbeat', { periodInMinutes: 1 });
  }

  // Reset ephemeral state and resume tracking
  await chrome.storage.session.set({
    hostname: null,
    startTime: null,
    isTracking: false,
    chromeFocused: true,
    userIdle: false,
  });

  const hostname = await getActiveTabHostname();
  if (hostname) {
    const state = await getCurrentState();
    await startSession(hostname, state);
  }
});

// ─── Message Handler ──────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
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
        const state = await getCurrentState();
        if (!message.enabled) {
          await stopSession(state);
          await chrome.storage.session.set({ ...state, isTracking: false, startTime: null });
        } else {
          const hostname = await getActiveTabHostname();
          await startSession(hostname, state);
        }
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
        const dayKey = `day_${getToday()}`;
        const stored = await chrome.storage.local.get({ [dayKey]: {} });
        const sites = JSON.parse(JSON.stringify(stored[dayKey])); // deep clone

        // Merge live partial session
        const state = await getCurrentState();
        if (state.isTracking && state.hostname && state.startTime) {
          const partial = Math.floor((Date.now() - state.startTime) / 1000);
          if (partial > 0) {
            if (sites[state.hostname]) {
              sites[state.hostname] = {
                ...sites[state.hostname],
                totalSeconds: sites[state.hostname].totalSeconds + partial,
              };
            }
          }
        }

        sendResponse({ sites });
        break;
      }

      case 'GET_RANGE': {
        // message.days: number of past days to aggregate
        const days = Math.max(1, Math.min(365, Number(message.days) || 7));
        const allSites = {};
        const now = new Date();

        for (let i = 0; i < days; i++) {
          const d = new Date(now);
          d.setDate(d.getDate() - i);
          const key = `day_${d.toISOString().split('T')[0]}`;
          const stored = await chrome.storage.local.get({ [key]: {} });

          for (const [host, stats] of Object.entries(stored[key])) {
            if (!allSites[host]) {
              allSites[host] = { ...stats, totalSeconds: 0, visits: 0 };
            }
            allSites[host].totalSeconds += stats.totalSeconds;
            allSites[host].visits += stats.visits;
            allSites[host].lastVisit = Math.max(allSites[host].lastVisit || 0, stats.lastVisit || 0);
            allSites[host].firstVisit = Math.min(allSites[host].firstVisit || Infinity, stats.firstVisit || Infinity);
          }
        }

        // Merge live partial session for today
        const state = await getCurrentState();
        if (state.isTracking && state.hostname && state.startTime) {
          const partial = Math.floor((Date.now() - state.startTime) / 1000);
          if (partial > 0 && allSites[state.hostname]) {
            allSites[state.hostname].totalSeconds += partial;
          }
        }

        sendResponse({ sites: allSites });
        break;
      }

      case 'GET_ALL_KEYS': {
        const all = await chrome.storage.local.get(null);
        const dayKeys = Object.keys(all).filter(k => k.startsWith('day_'));
        sendResponse({ keys: dayKeys.sort() });
        break;
      }

      case 'GET_DAILY_BREAKDOWN': {
        // Returns per-day totals for the last N days (for trend chart)
        const days = Math.max(1, Math.min(90, Number(message.days) || 7));
        const result = [];
        const now = new Date();

        for (let i = days - 1; i >= 0; i--) {
          const d = new Date(now);
          d.setDate(d.getDate() - i);
          const dateStr = d.toISOString().split('T')[0];
          const key = `day_${dateStr}`;
          const stored = await chrome.storage.local.get({ [key]: {} });
          const totalSeconds = Object.values(stored[key]).reduce(
            (sum, s) => sum + (s.totalSeconds || 0), 0
          );
          result.push({ date: dateStr, totalSeconds });
        }

        sendResponse({ days: result });
        break;
      }

      case 'CLEAR_ALL_DATA': {
        const all = await chrome.storage.local.get(null);
        const dayKeys = Object.keys(all).filter(k => k.startsWith('day_'));
        await chrome.storage.local.remove(dayKeys);

        // Reset session
        const state = await getCurrentState();
        await chrome.storage.session.set({ ...state, isTracking: false, hostname: null, startTime: null });
        sendResponse({ ok: true });
        break;
      }

      case 'CLEAR_SITE': {
        const dayKey = `day_${getToday()}`;
        const stored = await chrome.storage.local.get({ [dayKey]: {} });
        delete stored[dayKey][message.hostname];
        await chrome.storage.local.set({ [dayKey]: stored[dayKey] });
        sendResponse({ ok: true });
        break;
      }

      default:
        sendResponse({ error: 'Unknown message type' });
    }
  })();
  return true; // keep message channel open for async response
});
