// =============================================================================
// SynActivity — Dashboard Script
// Pure Canvas charts, no external dependencies, 100% local.
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

const VIEW_CONFIG = {
  today: { title: 'Today',      days: 1,  trendDays: 7  },
  week:  { title: 'This Week',  days: 7,  trendDays: 7  },
  month: { title: 'This Month', days: 30, trendDays: 30 },
};

// ─── State ────────────────────────────────────────────────────────────────────
let state = {
  view:       'today',
  data:       {},
  sortCol:    'totalSeconds',
  sortAsc:    false,
  searchQ:    '',
  settings:   { idleThresholdSeconds: 60, trackingEnabled: true, customCategories: {} },
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
  if (!seconds || seconds < 1) return '0s';
  if (seconds < 60) return `${Math.floor(seconds)}s`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatDate(ts) {
  if (!ts) return '—';
  const d = new Date(ts);
  const now = new Date();
  const diffMs = now - d;
  if (diffMs < 60000)    return 'just now';
  if (diffMs < 3600000)  return `${Math.floor(diffMs/60000)}m ago`;
  if (diffMs < 86400000) return `${Math.floor(diffMs/3600000)}h ago`;
  return d.toLocaleDateString('en-US', { month:'short', day:'numeric' });
}

function getAvatarColor(hostname) {
  let hash = 0;
  for (const c of hostname) hash = (hash * 31 + c.charCodeAt(0)) >>> 0;
  return `hsl(${hash % 360}, 65%, 40%)`;
}

function getCatColor(cat) {
  return CATEGORY_COLORS[cat] || CATEGORY_COLORS['Other'];
}

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1,3), 16);
  const g = parseInt(hex.slice(3,5), 16);
  const b = parseInt(hex.slice(5,7), 16);
  return { r, g, b };
}

// ─── Data Fetching ────────────────────────────────────────────────────────────
async function fetchData(view) {
  if (view === 'today') {
    const res = await msg('GET_TODAY');
    return res.sites || {};
  }
  const days = VIEW_CONFIG[view].days;
  const res = await msg('GET_RANGE', { days });
  return res.sites || {};
}

async function fetchTrend(view) {
  const days = VIEW_CONFIG[view].trendDays;
  const res = await msg('GET_DAILY_BREAKDOWN', { days });
  return res.days || [];
}

async function fetchSettings() {
  const res = await msg('GET_STATUS');
  return {
    idleThresholdSeconds: res.idleThresholdSeconds || 60,
    trackingEnabled:      res.trackingEnabled !== false,
    customCategories:     res.customCategories || {},
  };
}

// ─── Stats ────────────────────────────────────────────────────────────────────
function renderStats(sites) {
  const entries = Object.entries(sites);
  const totalSec = entries.reduce((s, [, v]) => s + (v.totalSeconds || 0), 0);
  const totalVisits = entries.reduce((s, [, v]) => s + (v.visits || 0), 0);
  const top = entries.sort(([,a],[,b]) => b.totalSeconds - a.totalSeconds)[0]?.[0] || '—';

  document.getElementById('sc-total').textContent  = formatTime(totalSec);
  document.getElementById('sc-sites').textContent  = entries.length || '—';
  document.getElementById('sc-top').textContent    = top.length > 14 ? top.slice(0,13)+'…' : top;
  document.getElementById('sc-visits').textContent = totalVisits || '—';
}

// ─── Bar Chart ────────────────────────────────────────────────────────────────
function renderBarChart(sites) {
  const wrap = document.getElementById('bar-chart-wrap');
  wrap.innerHTML = '';

  const sorted = Object.entries(sites)
    .sort(([,a],[,b]) => b.totalSeconds - a.totalSeconds)
    .slice(0, 10);

  if (sorted.length === 0) {
    wrap.innerHTML = '<div style="color:var(--text-3);font-size:13px;padding:32px 0;text-align:center">No data yet</div>';
    return;
  }

  const maxSec = sorted[0][1].totalSeconds || 1;

  sorted.forEach(([hostname, stats], i) => {
    const ratio = stats.totalSeconds / maxSec;
    const color = getCatColor(stats.category);
    const avatarBg = getAvatarColor(hostname);
    const display = hostname.length > 18 ? hostname.slice(0, 16) + '…' : hostname;

    const row = document.createElement('div');
    row.className = 'bar-row';
    row.style.animationDelay = `${i * 40}ms`;
    row.innerHTML = `
      <div class="bar-avatar" style="background:${avatarBg}">${hostname[0].toUpperCase()}</div>
      <div class="bar-label" title="${hostname}">${display}</div>
      <div class="bar-track">
        <div class="bar-fill" style="width:${ratio*100}%;background:linear-gradient(90deg,${color},${color}99);animation-delay:${i*40+60}ms"></div>
      </div>
      <div class="bar-time">${formatTime(stats.totalSeconds)}</div>
    `;
    wrap.appendChild(row);
  });
}

// ─── Donut Chart ─────────────────────────────────────────────────────────────
let donutAnim = null;

function renderDonutChart(sites) {
  const canvas = document.getElementById('donut-canvas');
  const ctx = canvas.getContext('2d');
  const legend = document.getElementById('donut-legend');
  const centerTime = document.getElementById('donut-time');

  // Group by category
  const catTotals = {};
  let totalSec = 0;
  for (const [, s] of Object.entries(sites)) {
    catTotals[s.category] = (catTotals[s.category] || 0) + s.totalSeconds;
    totalSec += s.totalSeconds;
  }

  centerTime.textContent = formatTime(totalSec);

  const entries = Object.entries(catTotals).sort(([,a],[,b]) => b - a);

  if (entries.length === 0) {
    ctx.clearRect(0, 0, 200, 200);
    legend.innerHTML = '<div style="color:var(--text-3);font-size:12px;text-align:center;padding:8px 0">No data yet</div>';
    return;
  }

  // Animate donut
  if (donutAnim) cancelAnimationFrame(donutAnim);

  const dpr = window.devicePixelRatio || 1;
  canvas.width  = 200 * dpr;
  canvas.height = 200 * dpr;
  canvas.style.width  = '200px';
  canvas.style.height = '200px';
  ctx.scale(dpr, dpr);

  const cx = 100, cy = 100, r = 80, innerR = 54;
  let progress = 0;

  const segments = entries.map(([cat, sec]) => ({
    cat, sec,
    color: getCatColor(cat),
    ratio: sec / totalSec,
  }));

  function draw() {
    ctx.clearRect(0, 0, 200, 200);
    const easedP = 1 - Math.pow(1 - Math.min(progress, 1), 3);
    let angle = -Math.PI / 2;

    segments.forEach(seg => {
      const sweep = seg.ratio * Math.PI * 2 * easedP;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, angle, angle + sweep);
      ctx.closePath();
      ctx.fillStyle = seg.color;
      ctx.fill();

      // Gap between slices
      angle += sweep + (easedP > 0 ? 0.01 : 0);
    });

    // Donut hole
    ctx.beginPath();
    ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
    ctx.fillStyle = '#070b18';
    ctx.fill();

    // Ring border
    ctx.beginPath();
    ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1;
    ctx.stroke();

    progress += 0.04;
    if (progress < 1) donutAnim = requestAnimationFrame(draw);
  }

  donutAnim = requestAnimationFrame(draw);

  // Legend
  legend.innerHTML = segments.map(seg => `
    <div class="legend-row">
      <div class="legend-dot" style="background:${seg.color}"></div>
      <div class="legend-name">${seg.cat}</div>
      <div class="legend-time">${formatTime(seg.sec)}</div>
      <div class="legend-pct">${Math.round(seg.ratio * 100)}%</div>
    </div>
  `).join('');
}

// ─── Trend Chart ─────────────────────────────────────────────────────────────
let trendAnim = null;

function renderTrendChart(trendData) {
  const canvas = document.getElementById('trend-canvas');
  const ctx = canvas.getContext('2d');

  if (!trendData || trendData.length === 0) {
    canvas.style.display = 'none';
    return;
  }
  canvas.style.display = 'block';

  const dpr = window.devicePixelRatio || 1;
  const W = canvas.parentElement.clientWidth - 44;
  const H = 100;

  canvas.width  = W * dpr;
  canvas.height = H * dpr;
  canvas.style.width  = W + 'px';
  canvas.style.height = H + 'px';
  ctx.scale(dpr, dpr);

  const maxSec = Math.max(...trendData.map(d => d.totalSeconds), 1);
  const n = trendData.length;
  const padL = 4, padR = 4, padT = 10, padB = 28;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;
  const barW = Math.max(4, Math.floor(chartW / n) - 4);
  const barGap = (chartW - barW * n) / (n - 1 || 1);

  if (trendAnim) cancelAnimationFrame(trendAnim);
  let progress = 0;

  function draw() {
    ctx.clearRect(0, 0, W, H);
    const easedP = 1 - Math.pow(1 - Math.min(progress, 1), 3);

    trendData.forEach((day, i) => {
      const x = padL + i * (barW + barGap);
      const ratio = day.totalSeconds / maxSec;
      const bH = Math.max(2, chartH * ratio * easedP);
      const y = padT + chartH - bH;

      // Bar
      const grad = ctx.createLinearGradient(0, y, 0, y + bH);
      grad.addColorStop(0, '#7c3aed');
      grad.addColorStop(1, '#06b6d4');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(x, y, barW, bH, [3, 3, 0, 0]);
      ctx.fill();

      // Date label
      if (progress >= 1) {
        const d = new Date(day.date);
        const label = d.toLocaleDateString('en-US', { weekday: n <= 7 ? 'short' : undefined, day: 'numeric' });
        ctx.fillStyle = '#475569';
        ctx.font = `500 9px -apple-system, system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(label.slice(0, 3), x + barW / 2, padT + chartH + 6);
      }
    });

    progress += 0.04;
    if (progress < 1.5) trendAnim = requestAnimationFrame(draw);
  }

  trendAnim = requestAnimationFrame(draw);
}

// ─── Table ────────────────────────────────────────────────────────────────────
function renderTable(sites) {
  const tbody = document.getElementById('table-body');
  const q = state.searchQ.toLowerCase();

  let entries = Object.entries(sites);

  // Filter
  if (q) {
    entries = entries.filter(([h, s]) =>
      h.toLowerCase().includes(q) ||
      (s.category || '').toLowerCase().includes(q)
    );
  }

  // Sort
  entries.sort(([ha, a], [hb, b]) => {
    let va, vb;
    if (state.sortCol === 'hostname') {
      va = ha; vb = hb;
    } else {
      va = a[state.sortCol] || 0;
      vb = b[state.sortCol] || 0;
    }
    const cmp = typeof va === 'string' ? va.localeCompare(vb) : va - vb;
    return state.sortAsc ? cmp : -cmp;
  });

  if (entries.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="table-empty">No sites match your search.</td></tr>';
    return;
  }

  tbody.innerHTML = entries.map(([hostname, s], i) => {
    const color   = getCatColor(s.category);
    const avatarBg = getAvatarColor(hostname);
    const display  = hostname.length > 30 ? hostname.slice(0, 28) + '…' : hostname;
    const { r, g, b } = hexToRgb(color);
    return `
      <tr style="animation:fadeSlide 0.2s ease ${i * 20}ms both">
        <td>
          <div class="td-site">
            <div class="td-avatar" style="background:${avatarBg}">${hostname[0].toUpperCase()}</div>
            <span class="td-name" title="${hostname}">${display}</span>
          </div>
        </td>
        <td>
          <span class="cat-badge" style="background:rgba(${r},${g},${b},0.12);color:${color}">
            ${s.category || 'Other'}
          </span>
        </td>
        <td class="td-time">${formatTime(s.totalSeconds)}</td>
        <td>${s.visits || 1}</td>
        <td>${formatDate(s.lastVisit)}</td>
      </tr>
    `;
  }).join('');
}

// ─── Navigation ───────────────────────────────────────────────────────────────
async function loadView(view) {
  state.view = view;
  const cfg = VIEW_CONFIG[view];

  // Update nav active state
  document.querySelectorAll('.nav-btn[data-view]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === view);
  });

  // Hide settings, show charts
  document.getElementById('settings-panel').style.display = 'none';
  document.getElementById('nav-settings').classList.remove('active');
  document.querySelector('.charts-row').style.display = 'grid';
  document.getElementById('trend-card').style.display  = '';
  document.querySelector('.table-card').style.display  = '';
  document.querySelector('.stats-grid').style.display  = 'grid';

  document.getElementById('page-title').textContent = cfg.title;
  document.getElementById('page-date').textContent  = buildDateRange(view);

  // Show loading skeleton
  document.getElementById('table-body').innerHTML =
    '<tr><td colspan="5" class="table-loading"><div class="spinner"></div></td></tr>';
  document.getElementById('bar-chart-wrap').innerHTML = '<div style="height:280px"></div>';

  // Fetch data in parallel
  const [data, trendData] = await Promise.all([
    fetchData(view),
    fetchTrend(view),
  ]);

  state.data = data;

  renderStats(data);
  renderBarChart(data);
  renderDonutChart(data);
  renderTrendChart(trendData);
  renderTable(data);
}

function buildDateRange(view) {
  const now  = new Date();
  const opts = { month: 'long', day: 'numeric', year: 'numeric' };
  if (view === 'today') return now.toLocaleDateString('en-US', opts);

  const days = VIEW_CONFIG[view].days;
  const from = new Date(now);
  from.setDate(from.getDate() - days + 1);
  const fromStr = from.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const toStr   = now.toLocaleDateString('en-US',  { month: 'short', day: 'numeric', year: 'numeric' });
  return `${fromStr} – ${toStr}`;
}

// ─── Sort ─────────────────────────────────────────────────────────────────────
function setupSort() {
  document.querySelectorAll('th.sortable').forEach(th => {
    th.addEventListener('click', () => {
      const col = th.dataset.col;
      if (state.sortCol === col) {
        state.sortAsc = !state.sortAsc;
      } else {
        state.sortCol = col;
        state.sortAsc = false;
      }

      // Update headers
      document.querySelectorAll('th.sortable').forEach(h => {
        h.classList.remove('active-sort', 'sort-asc', 'sort-desc');
        h.querySelector('.sort-arrow').textContent = '↕';
      });
      th.classList.add('active-sort', state.sortAsc ? 'sort-asc' : 'sort-desc');
      th.querySelector('.sort-arrow').textContent = state.sortAsc ? '↑' : '↓';

      renderTable(state.data);
    });
  });
}

// ─── Settings ─────────────────────────────────────────────────────────────────
async function openSettings() {
  const panel = document.getElementById('settings-panel');
  panel.style.display = '';

  // Hide nav views
  document.querySelector('.charts-row').style.display = 'none';
  document.getElementById('trend-card').style.display  = 'none';
  document.querySelector('.table-card').style.display  = 'none';
  document.querySelector('.stats-grid').style.display  = 'none';
  document.getElementById('page-title').textContent     = 'Settings';
  document.getElementById('page-date').textContent      = '';
  document.querySelectorAll('.nav-btn[data-view]').forEach(b => b.classList.remove('active'));
  document.getElementById('nav-settings').classList.add('active');

  // Load current settings
  const s = await fetchSettings();
  state.settings = s;

  const slider = document.getElementById('idle-slider');
  const sliderVal = document.getElementById('idle-val');
  slider.value = s.idleThresholdSeconds;
  sliderVal.textContent = `${s.idleThresholdSeconds}s`;

  slider.oninput = () => { sliderVal.textContent = `${slider.value}s`; };
  slider.onchange = async () => {
    await msg('SET_IDLE_THRESHOLD', { seconds: Number(slider.value) });
  };

  // Clear all data
  document.getElementById('btn-clear').onclick = async () => {
    if (!confirm('⚠️ This will permanently delete ALL tracked data.\n\nAre you sure?')) return;
    await msg('CLEAR_ALL_DATA');
    alert('All data cleared.');
    await loadView('today');
  };

  // Add custom category
  document.getElementById('btn-add-cat').onclick = async () => {
    const domain = document.getElementById('custom-domain').value.trim().replace(/^www\./, '');
    const cat    = document.getElementById('custom-cat').value;
    if (!domain) { alert('Please enter a domain.'); return; }

    const { customCategories = {} } = await chrome.storage.local.get({ customCategories: {} });
    customCategories[domain] = cat;
    await chrome.storage.local.set({ customCategories });
    document.getElementById('custom-domain').value = '';
    alert(`✓ ${domain} → ${cat}`);
  };
}

// ─── Export ───────────────────────────────────────────────────────────────────
async function exportData() {
  const allRes = await msg('GET_ALL_KEYS');
  const keys   = allRes.keys || [];
  const export_ = {};

  for (const key of keys) {
    const stored = await chrome.storage.local.get({ [key]: {} });
    export_[key] = stored[key];
  }

  const json   = JSON.stringify(export_, null, 2);
  const blob   = new Blob([json], { type: 'application/json' });
  const url    = URL.createObjectURL(blob);
  const a      = document.createElement('a');
  a.href       = url;
  a.download   = `synactivity-export-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Status Badge ─────────────────────────────────────────────────────────────
async function refreshStatusBadge() {
  const res  = await msg('GET_STATUS');
  const dot  = document.getElementById('status-dot');
  const text = document.getElementById('status-text');
  const toggle = document.getElementById('global-toggle');

  toggle.checked = res.trackingEnabled !== false;

  if (!res.trackingEnabled) {
    dot.className = 'status-dot paused';
    text.textContent = 'Tracking off';
  } else if (res.state?.isTracking) {
    dot.className = 'status-dot active';
    text.textContent = res.state.hostname || 'Tracking…';
  } else {
    dot.className = 'status-dot';
    text.textContent = res.state?.userIdle ? 'Idle' : 'Waiting…';
  }
}

// ─── Init ─────────────────────────────────────────────────────────────────────
async function init() {
  // Navigation buttons
  document.querySelectorAll('.nav-btn[data-view]').forEach(btn => {
    btn.addEventListener('click', () => loadView(btn.dataset.view));
  });
  document.getElementById('nav-settings').addEventListener('click', openSettings);
  document.getElementById('btn-export').addEventListener('click', exportData);

  // Global tracking toggle
  document.getElementById('global-toggle').addEventListener('change', async (e) => {
    await msg('SET_TRACKING', { enabled: e.target.checked });
    await refreshStatusBadge();
    if (e.target.checked) await loadView(state.view);
  });

  // Search
  document.getElementById('table-search').addEventListener('input', (e) => {
    state.searchQ = e.target.value;
    renderTable(state.data);
  });

  // Sort headers
  setupSort();

  // Export button
  document.getElementById('btn-export').addEventListener('click', exportData);

  // Live status refresh every 5 seconds
  await refreshStatusBadge();
  setInterval(refreshStatusBadge, 5000);

  // Auto-refresh today's data every 30 seconds when on today view
  setInterval(async () => {
    if (state.view === 'today') {
      const data = await fetchData('today');
      state.data = data;
      renderStats(data);
      renderBarChart(data);
      renderDonutChart(data);
      renderTable(data);
    }
  }, 30000);

  // Initial load
  await loadView('today');
}

document.addEventListener('DOMContentLoaded', init);
