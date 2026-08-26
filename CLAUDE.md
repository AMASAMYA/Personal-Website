# Working Notes for Claude

This file captures persistent preferences and project context for Claude sessions
working on this repository. Read it at the start of any session.

## About the human in this project

**Akhilesh Malani** - accessibility architect and digital inclusion strategist.
**Screen-reader user**, primarily NVDA and JAWS on Windows. Less proficient
with VoiceOver on macOS than with NVDA/JAWS on Windows.

The audience for many of the drafts I prepare (mailing-list replies, beta
tester invitations, follow-up emails) is **also the blind community**. Many
of them are screen reader users.

## Mandatory style rules

### Every instruction step I write must be screen-reader-first

This applies both to:

- **Instructions I give Akhilesh directly** in chat (how to install something,
  how to navigate a dashboard, how to verify a setting).
- **Drafts I prepare for Akhilesh to send to others** (mailing-list replies,
  emails, tester briefs).

Specifically, this means:

- **No visual locators.** Never say "look at the top-right" or "the icon
  in the corner" or "the third button from the left".
- **Use keyboard navigation language.** Tab, Shift+Tab, Enter, Space, arrow
  keys, screen-reader-specific hotkeys (H for heading in NVDA/JAWS browse
  mode, B for button, F for form field, K for link, D for landmark,
  VO + Cmd + H on VoiceOver, and so on).
- **Use direct URLs wherever possible** to bypass UI navigation entirely.
  If the destination has a deep link, give the URL instead of "navigate to X
  by clicking Y then Z".
- **Reference UI by label text and role**, not by position. Say "the button
  labelled Save" not "the Save button at the bottom of the form" - labels
  are unambiguous to a screen reader; positions are not.
- **State what the screen reader will announce** at each step where useful.
  "Your screen reader will announce 'Page loaded'." "NVDA will announce
  'button' followed by the button's label."
- **Acknowledge known accessibility quirks** of the surface being used.
  Example: Chrome's side panel sometimes does not appear in F6 cycle on the
  first press; tell the user this proactively rather than letting them
  discover it as a failure.

### Punctuation rule (immutable)

**Never use the em-dash character.** That includes the literal Unicode
em-dash (code point U+2014), the HTML named character reference for the
em-dash, and any visual approximation of it. This applies to every piece
of text I produce: chat responses, file content, code comments, commit
messages, blog posts, audit-finding copy, anywhere. Akhilesh established
this rule on 19 May 2026 after a full repo sweep removed roughly 1,800
existing em-dashes.

When the prose would naturally call for an em-dash, use one of:

- a regular hyphen with surrounding spaces ( - ),
- a comma,
- a colon,
- a full stop and a new sentence.

Pick whichever reads cleanest in context. Em-dashes do not appear in
this project, ever, going forward.

### Tone

- **Plain, direct, no marketing language.**
- **Honest about limitations and false positives.**
- **No celebratory or congratulatory framing** unless explicitly warranted by
  a real achievement. Akhilesh has flagged that "this sounds rude" feedback
  once - calibrate to warm-but-direct.
- **Brevity over comprehensiveness.** When in doubt, shorter is better.

### Modifiers Akhilesh uses

| Modifier | Meaning |
|---|---|
| `/silent` | No preamble, no commentary - give the answer directly. |

## Project context (as of 2026-08-26)

- **Personal-Website** (this repo) hosts three product surfaces plus the founder portfolio:
  1. akhileshmalani.com - personal portfolio + blog.
  2. amasamya.akhileshmalani.com - the AMASAMYA audit platform (single-file SPA in `amasamya/index.html`, Firebase Auth + Firestore).
  3. amasamya.com - **mega-platform brand home** (live), currently serves `amasamya-home.html` with the two-pillars framing (Accessibility Audit Suite + AMASAMYA Academy).

- **Domains owned:** akhileshmalani.com (root portfolio, live), amasamya.com (mega-platform home, live), amasamya.org and amasamya.in (reserved, not yet pointed anywhere). Netlify auto-deploys on push to `main`.

- **AMASAMYA Chrome extension** - Published on Chrome Web Store at extension ID `blnfmiipkccpggpinjofhhglfcgglbif`. Current live version **v5.2.0** (25 users, updated 13 August 2026). Version history v4.0.0 through v4.3.1 all Published; v4.3.1 was a same-week ten-bug quality patch after v4.3.0. Version alignment policy with the web platform is Option B (MAJOR.MINOR match, PATCH may differ). **v5.3.0 is built in the working tree and packaged in `dist/AMASAMYA-Chrome-Edge-Extension-v5.3.0.zip` but NOT yet uploaded to any store.** v5.3.0 adds GIGW 3.0 and IS 17802 India-national audit engines, a VPAT 2.4 ACR exporter, and visual diffs on audit history.

- **AMASAMYA Microsoft Edge extension** - Published on Microsoft Edge Add-ons store, same Chromium codebase as Chrome, currently at v5.2.0. v5.3.0 built, awaiting upload.

- **AMASAMYA Firefox add-on** - Published on addons.mozilla.org as `amasamya-accessibility-audit`, currently at v5.2.0. Source lives in `amasamya-extension-firefox/` (folder renamed from `ama11y-extension-firefox` on 2026-08-26). Firefox port uses `sidebar/` instead of `sidepanel/` and omits the `debugger` permission (no Visual Layout Auditor on Firefox). v5.3.0 packaged in `dist/AMASAMYA-Firefox-Addon-v5.3.0.zip`, awaiting upload.

- **AMASAMYA Android auditor app** - Kotlin 2.0 + Jetpack Compose, min API 24, Apache 2.0 licensed. Real-time audits against native Android apps via the AccessibilityService API. Six feature clusters shipped (see the app's own README): live TalkBack captions and focus-trail visualiser, colour-coded touch-target boundary mapper, focus-trap detector, real-time contrast drift scanner, multi-standard rules engine (WCAG 2.2 / Section 508 / EN 301 549), one-click fix generator, offline report exporter, hands-free voice commands, TalkBack simulator mode for sighted testers. Currently **closed beta on Google Play**; public release ASO description drafted. Source and workspace at `C:\Users\akhi_\antigravity\focused-fermi` (separate from this repo). See memory: `reference-android-app-path`.

- **v5.2.0 feature summary (across Chrome/Edge/Firefox)**: Scheduled Crawls (chrome.alarms per user-configured schedule; alarm-fire runs Site Crawl and diffs against history; run summary posted to Slack / Teams / generic-JSON webhook; run records flushed to Firestore scheduledRuns collection when platform tab is open; missed-run replay on service worker startup; 23 unit tests). v4.3.0 shipped Audit Diff and History (10 audits per URL in chrome.storage.local, 8 MB soft cap with eviction, four-verdict diff engine, diff CSV export, History section with per-URL Load and clear controls, polite-region diff summary announcement). v4.2.0 "Site Crawl" (queue + sitemap parser + side-panel tab + platform Aggregated Reports + four export shapes + concurrent runner + JAWS-arrow-key `role="application"` URL fields + focus trap + confirmation dialog on Close/Escape). Default keyboard shortcut Alt+Shift+1 after JAWS conflicts on Alt+Shift+Period. See `amasamya-extension/ROADMAP.md`.

- **AMASAMYA Academy (mega-platform)** - Scaffolding built (`academy.html`, `academy-admin.html`, `academy-author.html`, `apply.html`, `amasamya-home.html`, `accessibility.html`, `amasamya-linter.js`, `library-admin.html`). Firestore rules for `academy_applications` deployed 2026-08-26 with founder-only read/update via Google Sign-In. Learner surface, educator studio wiring, and content production paused because L. Subramani (Academy co-lead) is unavailable until roughly mid-September 2026. See memories: `project-subramani-hold`, `project-amasamya-strategic-proposal`.

- **Strategic proposal source-of-truth** for the mega-platform: `C:\Users\akhi_\antigravity\focused-fermi\AMASAMYA_Strategic_Proposal_v2.1.md` (Aug 2026). Key facts settled in v2.1: Akhilesh is sole owner of the master entity and all software IP; Subramani is Founding Academic Director with an equitable revenue-share on Academy revenue after infrastructure costs; certificates co-signed; four pillars with Year-1 = Pillar 1 + Pillar 4a, Year-2 = CopyAudit + CodeLab, v3+ = Indic regional languages; three-phase 12-month roadmap with numeric gates.

- **Public source** - github.com/AMASAMYA/AMASAMYA (mirror of the Chrome extension code; MIT licence). The full Personal-Website source remains private at github.com/AMASAMYA/Personal-Website.

## Things to avoid

- Suggesting screenshot-driven debugging unless Akhilesh has already supplied
  the screenshot.
- Suggesting Akhilesh "look at" anything visual on a UI.
- Suggesting "pin the icon to your toolbar" or other visual-affordance tips.
- Recommending tasks that require GUI clicks when an equivalent CLI / URL /
  keyboard path exists.
- Adding emoji, decorative dashes, or visual ASCII art to any output Akhilesh
  will read with a screen reader.
- Bulk-replying with "this is great work!" - Akhilesh prefers honest
  assessment over encouragement.
