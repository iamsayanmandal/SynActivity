# SynActivity — Chrome Web Store Submission Guide

## Pre-Publish Checklist

- [x] Manifest V3
- [x] All icon sizes present (16, 48, 128)
- [x] No host_permissions
- [x] Privacy Policy written (PRIVACY.md — needs to be hosted)
- [x] Permissions minimized
- [ ] Screenshots taken (need min 1 at 1280×800)
- [ ] Privacy policy hosted at a public URL (e.g., GitHub Pages or raw GitHub)
- [ ] Developer account created ($5 one-time fee)
- [ ] ZIP file prepared (without generate-icons.py)

---

## Step 1 — Host Your Privacy Policy (Free)

The CWS requires a **live URL** for the privacy policy.

**Easiest option — GitHub raw link:**
After pushing to GitHub, your policy will be live at:
```
https://raw.githubusercontent.com/iamsayanmandal/SynActivity/main/PRIVACY.md
```

Or use GitHub Pages (cleaner URL):
1. Go to your repo → Settings → Pages
2. Source: `main` branch, `/` root
3. Your policy will be at: `https://iamsayanmandal.github.io/SynActivity/PRIVACY.md`

---

## Step 2 — Take Screenshots

Required: at least 1 screenshot at **1280×800** or **640×400** pixels.

Steps:
1. Load the extension unpacked in Chrome
2. Open the dashboard (click SynActivity icon → Open Dashboard)
3. Browse a few sites for a few minutes to populate data
4. Press `Cmd+Shift+4` on Mac → select the browser window area
5. Take at least:
   - 1 screenshot of the **Dashboard** (Today view with charts populated)
   - 1 screenshot of the **Popup** (showing site list)

---

## Step 3 — Create Developer Account

1. Go to: https://chrome.google.com/webstore/devconsole
2. Sign in with your Google account
3. Pay the one-time $5 registration fee
4. Accept the developer agreement

---

## Step 4 — Prepare the ZIP

Create a ZIP **without** the developer-only files:
```bash
cd /Users/sayan
zip -r SynActivity.zip SynActivity \
  --exclude "SynActivity/generate-icons.py" \
  --exclude "SynActivity/.git/*" \
  --exclude "SynActivity/.DS_Store" \
  --exclude "SynActivity/README.md" \
  --exclude "SynActivity/PRIVACY.md" \
  --exclude "SynActivity/LICENSE" \
  --exclude "SynActivity/.gitignore" \
  --exclude "SynActivity/CHROMEWEBSTORE.md"
```

ZIP must contain: `manifest.json`, `background/`, `popup/`, `dashboard/`, `icons/`

---

## Step 5 — Store Listing Copy

### Extension Name
```
SynActivity — Local Web Time Tracker
```

### Short Description (132 chars max)
```
Track actual time spent on websites. Detects idle time, tab focus & window focus. 100% local — no cloud, no data leaks.
```

### Detailed Description
```
SynActivity tracks exactly how long you spend on each website — not how long a tab exists, but how long you're actually using it.

HOW IT WORKS
SynActivity only counts time when Chrome is focused + the tab is active + you haven't been idle for more than 60 seconds. The moment you switch apps, minimize Chrome, or step away from your keyboard, the timer stops.

DASHBOARD
• Today / This Week / This Month views
• Animated bar chart of your top 10 sites
• Donut chart breaking down time by category (Social, Development, AI, Entertainment, etc.)
• Daily trend chart showing usage over 7 or 30 days
• Sortable table with time, visits, and last-visit for every site

CATEGORIES (auto-detected)
Sites are automatically grouped: Social · Development · Entertainment · Productivity · Search · AI · News. Add custom categories for any domain in Settings.

100% PRIVATE — ZERO NETWORK REQUESTS
Unlike most time trackers, SynActivity never sends your data anywhere. Everything is stored locally in your browser. No account required. No subscription. The extension makes zero network requests — enforced by a strict Content Security Policy.

EXPORT & CONTROL
• Export all your data as JSON anytime
• Adjust idle timeout (15–300 seconds)
• Pause tracking with one click
• Clear all data with one click
```

---

## Permission Justifications

| Permission | Justification (copy into CWS dashboard) |
|---|---|
| `tabs` | Required to read the URL of the currently active tab. The extension reads only the hostname (e.g., "github.com"), not the full URL or page content. |
| `storage` | Required to save tracking data locally on the user's device using chrome.storage.local. All data remains on the device and is never transmitted. |
| `idle` | Required to detect when the user's system is idle. When the user is idle, the timer pauses so idle time is not counted as active browsing time. |
| `alarms` | Required to run a periodic 1-minute heartbeat that saves partial session data, preventing data loss if Chrome is closed unexpectedly. |

---

## Privacy Practices (Data Use Disclosure Form)

- Does not use or transfer user data for unrelated purposes: **Yes**
- Does not sell user data: **Yes**  
- Does not use data to determine creditworthiness: **Yes**
- **Data collected:** None — no data is collected, transmitted, or stored outside the user's local device.

---

## Category
**Productivity**

---

## Single Purpose Statement
```
SynActivity tracks the time a user actively spends on websites by monitoring tab activity, window focus, and system idle state — storing all data locally on the device.
```

---

## After Submission

- Google review: typically **2–7 business days** for new extensions
- You'll get an email when approved or if changes are needed
- Our advantages for fast approval:
  - ✅ Specific permission justifications
  - ✅ Privacy policy hosted and linked
  - ✅ No broad host_permissions
  - ✅ No remote code execution

---

> [!NOTE]
> After approval, update this file with the Chrome Web Store URL and extension ID.
