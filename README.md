<div align="center">
  <img src="icons/icon-128.png" width="96" alt="SynActivity" />
  <h1>SynActivity</h1>
  <p><strong>Smart local web time tracker for Chrome.</strong><br/>Tracks actual time — not just how long a tab stays open.</p>

  <p>
    <img src="https://img.shields.io/badge/Chrome-Extension-4285F4?style=flat-square&logo=google-chrome&logoColor=white" alt="Chrome Extension"/>
    <img src="https://img.shields.io/badge/Manifest-V3-22c55e?style=flat-square" alt="Manifest V3"/>
    <img src="https://img.shields.io/badge/Network_Requests-Zero-ef4444?style=flat-square" alt="Zero network"/>
    <img src="https://img.shields.io/badge/License-Apache_2.0-3b82f6?style=flat-square" alt="License"/>
    <img src="https://img.shields.io/badge/Data-100%25_Local-7c3aed?style=flat-square" alt="Local only"/>
  </p>

  <p>
    <a href="https://github.com/iamsayanmandal/SynActivity/releases/latest/download/SynActivity.zip">
      <img src="https://img.shields.io/badge/Download-Latest_ZIP-06b6d4?style=for-the-badge" alt="Download ZIP"/>
    </a>
  </p>
</div>

---

## Install (No account or payment needed)

> SynActivity is not on the Chrome Web Store — it installs directly in seconds.
> Your data is never affected by reinstalls or updates.

**Step 1** — Download the latest ZIP

Click the button above, or go to [Releases](https://github.com/iamsayanmandal/SynActivity/releases/latest) and download `SynActivity.zip`

**Step 2** — Extract the ZIP

On Mac: double-click the ZIP file  
On Windows: right-click the ZIP → "Extract All"

**Step 3** — Open Chrome Extensions

Type `chrome://extensions` in your address bar and press Enter

**Step 4** — Enable Developer Mode

Toggle the switch in the **top-right corner** of the extensions page

**Step 5** — Load the extension

Click **"Load unpacked"** → select the extracted `SynActivity` folder

**Step 6** — Done

The SynActivity icon appears in your Chrome toolbar. Click it to start.

---

> **Updating the extension** — When a new version releases, download the new ZIP, extract it into the same folder (overwrite), then go to `chrome://extensions` and click the refresh icon on SynActivity. All your tracked data is preserved automatically — updates never delete your history.

---

## Why SynActivity

Most time trackers (RescueTime, Toggl, WakaTime) send your browsing activity to their servers. SynActivity does not. Every byte of your data stays in your browser, under your full control.

| | SynActivity | Cloud-based trackers |
|---|---|---|
| Data stays on your device | Yes | No |
| Accurate idle detection | Yes | Partial |
| Free forever | Yes | Freemium |
| No account required | Yes | No |
| No network calls | Yes | No |
| Open source | Yes | No |

---

## How Time Is Measured

SynActivity counts time only when all three conditions are true at once:

```
Chrome window is focused   (not minimized, not another app in front)
Tab is the active tab      (not a background tab)
You are not idle           (mouse or keyboard activity in the last 60 seconds)
```

A YouTube tab open for 5 hours does not count as 5 hours. It counts only the time you were actually watching.

---

## Features

### Popup (click the toolbar icon)

- Live indicator showing the site currently being tracked
- Stats for today: total time, sites visited, top category
- Top 8 sites with animated time bars and category colors
- One-click tracking toggle (pause / resume)
- Button to open the full dashboard

### Dashboard (full-page analytics)

**Views:** Today / This Week / This Month

**Stat cards:** Total time · Sites visited · Top site · Total visits

**Charts:**
- Horizontal bar chart — top 10 sites by time, with smooth animations
- Donut chart — time split by category
- Trend chart — daily usage bars over 7 or 30 days

**Table:**
- All tracked sites, sortable by any column
- Live search and filter by domain or category
- Category badges, visit count, last-seen time

**Settings:**
- Idle timeout: adjustable from 15 to 300 seconds (default 60)
- Custom category for any domain
- Export all data as JSON
- Clear all data (with confirmation)

---

## Auto-Categories

Sites are automatically assigned a category based on their domain.

| Category | Examples |
|---|---|
| Social | youtube.com, reddit.com, twitter.com, instagram.com |
| Development | github.com, stackoverflow.com, gitlab.com, npmjs.com |
| Entertainment | netflix.com, spotify.com, twitch.tv |
| Productivity | notion.so, figma.com, docs.google.com, trello.com |
| Search | google.com, duckduckgo.com, bing.com |
| AI | chatgpt.com, claude.ai, gemini.google.com |
| News | news.ycombinator.com, techcrunch.com, bbc.com |
| Other | Everything not in the list above |

Add custom categories for any domain in the Dashboard → Settings panel.

---

## Privacy and Security

SynActivity makes zero network requests. This is enforced at the browser level:

```json
"content_security_policy": {
  "extension_pages": "script-src 'self'; object-src 'none'; connect-src 'none';"
}
```

- No host permissions — the extension never touches web page content
- No account, no login, no registration
- Data lives in `chrome.storage.local`, sandboxed to the extension only
- Export your data at any time as a JSON file
- Uninstalling the extension removes all stored data

Full policy: [PRIVACY.md](PRIVACY.md)

---

## Data Format

All data is stored locally as:

```json
{
  "day_2025-01-15": {
    "github.com": {
      "totalSeconds": 3720,
      "visits": 8,
      "firstVisit": 1736924400000,
      "lastVisit":  1736946000000,
      "category": "Development"
    }
  }
}
```

One key per day. Export and inspect anytime from the Dashboard.

---

## Build from Source

```bash
git clone https://github.com/iamsayanmandal/SynActivity.git
cd SynActivity

# Regenerate icons (optional)
pip3 install Pillow
python3 generate-icons.py

# Load unpacked in Chrome as described in the Install section above
```

---

## Contributing

Pull requests are welcome. Please open an issue first for any significant changes.

1. Fork the repository
2. Create a branch: `git checkout -b feature/your-feature`
3. Commit your changes
4. Open a Pull Request

---

## Built by

**Sayan Mandal**

Portfolio: [sayanmandal.in](https://sayanmandal.in)  
GitHub: [@iamsayanmandal](https://github.com/iamsayanmandal)

---

## License

[Apache License 2.0](LICENSE) — Copyright 2025 Sayan Mandal
