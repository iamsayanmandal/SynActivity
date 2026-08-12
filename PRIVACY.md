# Privacy Policy for SynActivity

**Effective date:** 2025  
**Developer:** Sayan Mandal ([@iamsayanmandal](https://github.com/iamsayanmandal))

---

## Overview

SynActivity is a browser extension that tracks the time you spend on websites.
**All data is stored exclusively on your device. Nothing is ever sent to any server.**

---

## Data Collected

SynActivity records the following data **locally on your device only**:

| Data | Where stored | Shared with anyone? |
|---|---|---|
| Hostnames of websites you visit | `chrome.storage.local` | ❌ Never |
| Time spent per website (seconds) | `chrome.storage.local` | ❌ Never |
| Number of visits per website | `chrome.storage.local` | ❌ Never |
| First / last visit timestamps | `chrome.storage.local` | ❌ Never |
| Category assignments | `chrome.storage.local` | ❌ Never |
| Extension settings (idle threshold) | `chrome.storage.local` | ❌ Never |

SynActivity does **not** collect:

- Page titles or full URLs (only the hostname, e.g., `github.com`)
- Page content or screenshots
- Search queries
- Form inputs or passwords
- Any personally identifiable information
- IP addresses or device identifiers

---

## Network Activity

SynActivity makes **zero network requests**. This is enforced at the browser level via a strict Content Security Policy:

```
connect-src 'none'
```

The extension does not communicate with any external server, analytics service, or third party under any circumstances.

---

## Data Storage

- All data is stored in **`chrome.storage.local`**, which is sandboxed to the extension and inaccessible to websites or other extensions.
- Data is never synced to Chrome Sync or any cloud service.
- You can export your data at any time (Dashboard → Settings → Export JSON).
- You can delete all data at any time (Dashboard → Settings → Clear All Data).
- Uninstalling the extension will delete all stored data.

---

## Permissions Used

| Permission | Why it's needed |
|---|---|
| `tabs` | Read the URL of the active tab to know which site you're on |
| `storage` | Save tracking data locally on your device |
| `idle` | Detect when you stop using your computer (to pause the timer) |
| `alarms` | Run a 1-minute heartbeat to persist partial session data |

No `host_permissions` are declared — the extension never accesses or modifies web page content.

---

## Your Rights

- **Access:** Export all your data as JSON from the Dashboard.
- **Delete:** Clear all data from the Dashboard, or uninstall the extension.
- **Portability:** Exported JSON files are in a standard, readable format.

---

## Changes to This Policy

If this policy changes materially, the extension version will be bumped and the changelog will note the update. The current version always reflects the current policy.

---

## Contact

For questions, open an issue at: https://github.com/iamsayanmandal/SynActivity/issues
