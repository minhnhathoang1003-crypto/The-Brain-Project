# Store listing — English

---

## Extension name
`The Brain Project · Focus Bridge`

---

## Short description — max 132 characters

**Primary (108 chars):**
```
Blocks the distracting sites on your own list. Unblock them only by earning credits with focused work.
```

**Alternate (125 chars)** — states the dependency up front:
```
Blocks distracting websites until you earn credits with focused work. Requires the free The Brain Project Windows app.
```

---

## Category
**Productivity → Workflow & Planning** (secondary: Tools)

---

## Detailed description

```
⚠ REQUIRES THE WINDOWS APP. This extension does not work on its own. It is the
bridge between your browser and The Brain Project app running on Windows 10/11.
Free download: https://the-brain-project.vercel.app

──────────────────────────────────────

ONE LOOP

Focus to earn credits. Spend credits to open the sites you blocked yourself.

5 minutes of focus = 1 credit. 1 credit = 1 minute of leisure.

There is no "pause blocking" button. No "just five more minutes." If you want
YouTube, you pay for it with work you actually did.

──────────────────────────────────────

SETUP

1. Install The Brain Project for Windows.
2. Install this extension.
3. Open Settings in the app and copy the pairing code.
4. Paste it into the extension popup and press Connect.

One time only. After that the extension reconnects on its own in about 2 seconds.

──────────────────────────────────────

WHAT IT DOES

• Blocks the domains on the list you maintain in the app — subdomains included.
• Blocks outside focus sessions too. A list entry means blocked; there is no toggle.
• Redirects already-open tabs to the block page, not just new navigations.
• When a temporary unblock expires, open tabs go back to the block page.
• Keeps the blocklist even when the app is closed, and revokes every temporary
  unblock the moment the connection drops. Killing the app in Task Manager does
  not unblock anything.

LOCK MODE

The app can hard-lock for 30 minutes to 4 hours. It cannot be cancelled or
shortened. While locked: no spending credits, no unblocking, no disconnecting
the extension.

The deadline is held by the extension itself, so closing the app or restarting
the browser will not break it.

──────────────────────────────────────

YOUR DATA

No accounts. No servers. No analytics. No ads.

The extension's only network connection is to 127.0.0.1 — your own machine —
where the app is running. Not one byte goes to the internet.

The extension reads tab URLs to compare them against your own blocklist, locally.
URLs are never written to disk, never sent to the app, never sent to anyone. Your
browsing history is not collected.

Privacy policy: https://the-brain-project.vercel.app/privacy

──────────────────────────────────────

LIMITATIONS, STATED UP FRONT

• Requires the Windows 10/11 app. No macOS, Linux, or mobile version yet.
• Removing the extension at chrome://extensions still defeats lock mode. That is
  a limitation of every browser extension, not just this one.
• Moving the system clock forward also ends a lock early. This is a deliberate
  trade-off — defending against it would make closing the app extend your lock.
• YouTube Shorts is not yet separable from YouTube.
• The Windows installer is not code-signed, so SmartScreen warns on first run.

──────────────────────────────────────

Source: https://github.com/minhnhathoang1003-crypto/The-Brain-Project
Support: minhnhat.hoang1003@gmail.com
```

---

## Single purpose statement

```
The single purpose of this extension is to block access to domains the user
selects themselves, and to temporarily unblock them when the user has earned
credits in The Brain Project application on Windows.

Every requested permission serves exactly that function: receiving the domain
list from the app running on the user's own machine, redirecting navigation
requests for those domains to a block page bundled inside the extension, and
removing the redirect when a valid temporary grant exists.

The extension has no second function. It injects no content scripts, reads and
modifies no page content, collects no data, and communicates with no remote
server of any kind.
```
