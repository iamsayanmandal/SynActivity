// =============================================================================
// SynActivity — Popup Script
// =============================================================================

// ─── Constants ────────────────────────────────────────────────────────────────
const CATEGORY_COLORS = {
  'Social':        '#f97316',
  'Development':   '#22c55e',
  'Entertainment': '#ef4444',
  'Productivity':  '#3b82f6',
  'Search':        '#a855f7',
  'AI':            '#06b6d4',
  'News':          '#eab308',
  'Other':         '#64748b',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function msg(type, payload = {}) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type, ...payload }, (res) => {
      resolve(res || {});
    });
  });
}

function formatTime(seconds) {
  if (!seconds || seconds < 60) return `${seconds || 0}s`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function getAvatarColor(hostname) {
  let hash = 0;
  for (const c of hostname) hash = (hash * 31 + c.charCodeAt(0)) >>> 0;
  const hue = hash % 360;
  return `hsl(${hue}, 65%, 40%)`;
}

function getCategoryColor(cat) {
  return CATEGORY_COLORS[cat] || CATEGORY_COLORS['Other'];
}

// ─── Render helpers ───────────────────────────────────────────────────────────
function renderStatus(status) {
  const toggle = document.getElementById('toggle-tracking');
  const dot    = document.getElementById('now-dot');
  const name   = document.getElementById('now-hostname');

  toggle.checked = status.trackingEnabled !== false;

  const state = status.state || {};
  if (state.isTracking && state.hostname) {
    dot.className = 'now-dot active';
    name.textContent = state.hostname;
    name.className = '';
  } else if (!status.trackingEnabled) {
    dot.className = 'now-dot idle';
    name.textContent = 'Tracking paused';
    name.className = 'muted';
  } else {
    dot.className = 'now-dot idle';
    name.textContent = state.userIdle ? 'Idle…' : 'Waiting for activity';
    name.className = 'muted';
  }
}

function renderStats(sites) {
  const entries = Object.entries(sites);
  const totalSeconds = entries.reduce((s, [, v]) => s + v.totalSeconds, 0);
  const sitesCount  = entries.length;

  // Top category by time
  const catTotals = {};
  for (const [, s] of entries) {
    catTotals[s.category] = (catTotals[s.category] || 0) + s.totalSeconds;
  }
  const topCat = Object.entries(catTotals).sort(([,a],[,b]) => b - a)[0]?.[0] || '—';

  document.getElementById('stat-total').textContent   = formatTime(totalSeconds);
  document.getElementById('stat-sites').textContent   = sitesCount || '—';
  document.getElementById('stat-top-cat').textContent = topCat;
}

function renderSites(sites) {
  const list = document.getElementById('sites-list');

  const sorted = Object.entries(sites)
    .sort(([, a], [, b]) => b.totalSeconds - a.totalSeconds)
    .slice(0, 8);

  if (sorted.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <strong>No activity yet</strong>
        Browse any website and SynActivity will start tracking automatically.
      </div>`;
    return;
  }

  const maxSec = sorted[0][1].totalSeconds || 1;

  list.innerHTML = sorted.map(([hostname, stats], i) => {
    const ratio       = stats.totalSeconds / maxSec;
    const barColor    = getCategoryColor(stats.category);
    const avatarColor = getAvatarColor(hostname);
    const display     = hostname.length > 26 ? hostname.slice(0, 24) + '…' : hostname;

    return `
      <div class="site-row" style="animation-delay:${i * 45}ms">
        <div class="site-avatar" style="background:${avatarColor}">
          ${hostname[0].toUpperCase()}
        </div>
        <div class="site-info">
          <div class="site-name">${display}</div>
          <div class="site-bar-wrap" style="animation-delay:${i * 45 + 100}ms">
            <div class="site-bar" style="width:${ratio * 100}%;background:${barColor};animation-delay:${i * 45 + 80}ms"></div>
          </div>
        </div>
        <div class="site-time">${formatTime(stats.totalSeconds)}</div>
        <div class="site-cat-badge" style="background:${barColor}20;color:${barColor}">
          ${stats.category || 'Other'}
        </div>
      </div>`;
  }).join('');
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function init() {
  // Fetch in parallel
  const [status, todayRes] = await Promise.all([
    msg('GET_STATUS'),
    msg('GET_TODAY'),
  ]);

  renderStatus(status);
  renderStats(todayRes.sites || {});
  renderSites(todayRes.sites || {});

  // Toggle tracking
  document.getElementById('toggle-tracking').addEventListener('change', async (e) => {
    const enabled = e.target.checked;
    await msg('SET_TRACKING', { enabled });
    renderStatus({ ...status, trackingEnabled: enabled });
  });

  // Open dashboard in a new tab
  document.getElementById('open-dashboard').addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('dashboard/dashboard.html') });
    window.close();
  });
}

document.addEventListener('DOMContentLoaded', init);
