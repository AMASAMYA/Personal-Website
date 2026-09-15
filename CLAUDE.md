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

## Project context (as of 2026-09-15, post-Academy retirement)

- **Personal-Website** (this repo) hosts three product surfaces plus the founder portfolio:
  1. akhileshmalani.com - personal portfolio + blog.
  2. amasamya.akhileshmalani.com - the AMASAMYA audit platform (single-file SPA in `amasamya/index.html`, Firebase Auth + Firestore).
  3. amasamya.com - **product brand home** (live), serves `amasamya-home.html`. Rewritten 2026-09-15 to be product-only (the four surfaces, the Web Audit Portal, install links). Previous two-pillar framing that included AMASAMYA Academy was retired; see the Academy note below.

- **Domains owned:** akhileshmalani.com (root portfolio, live), amasamya.com (mega-platform home, live), amasamya.org and amasamya.in (reserved, not yet pointed anywhere). Netlify auto-deploys on push to `main`.

- **AMASAMYA Chrome extension** - Published on Chrome Web Store at extension ID `blnfmiipkccpggpinjofhhglfcgglbif`. Current live version **v5.3.2**. **v5.3.4 packaged and awaiting upload** (drops the "Learn in AMASAMYA Academy" link from each finding's detail disclosure after the Academy retirement on 2026-09-15). v5.3.1 was skipped in favour of uploading v5.3.2 directly. Version history v4.0.0 through v5.3.0 all Published. Version alignment policy with the web platform is Option B (MAJOR.MINOR match, PATCH may differ). v5.3.0 added GIGW 3.0 and IS 17802 India-national audit engines, a VPAT 2.4 ACR exporter, and visual diffs on audit history.

- **AMASAMYA Microsoft Edge extension** - Published on Microsoft Edge Add-ons store, same Chromium codebase as Chrome. Current live version **v5.3.2** (approved 2026-09-15). **v5.3.4 packaged and awaiting upload** alongside Chrome (same Chromium ZIP for both stores). v5.3.1 was skipped in favour of v5.3.2 directly. Store URL: https://microsoftedge.microsoft.com/addons/detail/amasamya-accessibility-/enpnjjkakecacidhckphimkmhobjcblj

- **AMASAMYA Firefox add-on** - Published on addons.mozilla.org as `amasamya-accessibility-audit`, current live version **v5.3.3** (approved 2026-09-10; Firefox-only patch that fixed two bugs: manifest suggested shortcut `Ctrl+Shift+U` replaced with `Alt+Shift+1`; `background.js` `chrome.sidePanel.open()` replaced with `browser.sidebarAction.open()`). **v5.3.4 packaged and awaiting upload** (same Academy-link removal as Chrome and Edge). v5.3.2 for Firefox was skipped. `amasamya-extension-firefox/USAGE.md` shipped as a screen-reader-first user guide; a compact 2573-char version lives in the AMO listing description. Source lives in `amasamya-extension-firefox/` (folder renamed from `ama11y-extension-firefox` on 2026-08-26). Firefox port uses `sidebar/` instead of `sidepanel/` and omits the `debugger` permission (no Visual Layout Auditor on Firefox).

- **AMASAMYA Android auditor app** - Kotlin 2.0 + Jetpack Compose, min API 24, Apache 2.0 licensed. Real-time audits against native Android apps via the AccessibilityService API. Six feature clusters shipped (see the app's own README): live TalkBack captions and focus-trail visualiser, colour-coded touch-target boundary mapper, focus-trap detector, real-time contrast drift scanner, multi-standard rules engine (WCAG 2.2 / Section 508 / EN 301 549), one-click fix generator, offline report exporter, hands-free voice commands, TalkBack simulator mode for sighted testers. **Live on Google Play as of 2026-09-07:** https://play.google.com/store/apps/details?id=org.amasamya.accessibility (package id `org.amasamya.accessibility`). Source and workspace at `D:\AMASAMYA` (separate from this repo; moved from `C:\Users\akhi_\antigravity\focused-fermi` on 2026-09-07). See memory: `reference-android-app-path`.

- **v5.2.0 feature summary (across Chrome/Edge/Firefox)**: Scheduled Crawls (chrome.alarms per user-configured schedule; alarm-fire runs Site Crawl and diffs against history; run summary posted to Slack / Teams / generic-JSON webhook; run records flushed to Firestore scheduledRuns collection when platform tab is open; missed-run replay on service worker startup; 23 unit tests). v4.3.0 shipped Audit Diff and History (10 audits per URL in chrome.storage.local, 8 MB soft cap with eviction, four-verdict diff engine, diff CSV export, History section with per-URL Load and clear controls, polite-region diff summary announcement). v4.2.0 "Site Crawl" (queue + sitemap parser + side-panel tab + platform Aggregated Reports + four export shapes + concurrent runner + JAWS-arrow-key `role="application"` URL fields + focus trap + confirmation dialog on Close/Escape). Default keyboard shortcut Alt+Shift+1 after JAWS conflicts on Alt+Shift+Period. See `amasamya-extension/ROADMAP.md`.

- **AMASAMYA Academy - retired on 2026-09-15**. The Academy pillar (learner surface, educator studio, cohort programme, School of English & Communication) was dropped when Akhilesh decided to proceed solo. L. Subramani, previously slated as Academy co-lead, is no longer involved in AMASAMYA. All Academy source files (`academy.html`, `academy-admin.html`, `academy-author.html`, `apply.html`, `library-admin.html`) were moved to `_archived/academy/` preserving git history. Firestore rules for `academy_applications` were removed; any residual writes to `academy_*` collections are now denied by the default deny-everything-else rule. `amasamya-home.html` was rewritten to be product-only. The strategic proposal at `D:\AMASAMYA\AMASAMYA_Strategic_Proposal_v2.1.md` describes the previous two-pillar plan and is now historical; a solo v3.0 document has not been written yet.

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
