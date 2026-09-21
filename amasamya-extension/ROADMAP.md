# AMASAMYA Chrome Extension Roadmap

Last reviewed: 2026-09-21 (Chrome live at v5.3.5; Firefox v5.3.5 approved earlier today but the focus fix silently no-ops on Firefox due to bug 1319368, so v5.3.6 Firefox-only was packaged and submitted the same evening to add the F6 instruction and window.focus() attempt. Edge live at v5.3.4 with v5.3.5 in certification).

This file captures what is committed, what is planned, and what has been
explicitly deferred. It is the single source of truth for "what is next".
If a feature is not on this list, it is not planned.

## Firefox-only patch, submitted to addons.mozilla.org: v5.3.6 (2026-09-21)

The v5.3.5 focus fix works on Chrome and Edge because Chromium's side-panel document shares the triggering page's focus scope, so `.focus()` from the panel script crosses successfully. Firefox's sidebar is architecturally different (a XUL panel hosting a separate document), and Firefox blocks the sidebar's own script from moving focus across the document boundary. This is Mozilla bug 1319368, WONTFIX. Akhilesh confirmed with NVDA on 2026-09-21 after v5.3.5 approved: sidebar opens, NVDA continues reading the page, focus never reaches the panel.

v5.3.6 Firefox-only ships three mitigations.

- Panel.js adds a `window.focus()` call before the element focus in `focusFirstPanelTab()`. Best-effort; helps on Firefox builds that permit sidebar self-focus, harmless no-op otherwise.
- Panel.html adds a permanent, always-visible instruction under the header: "Panel opened. Press F6 to bring keyboard focus into this panel." The panel banner is the first thing NVDA and JAWS announce when the user reaches the panel by any route, so the recovery keystroke is baked into the UI instead of hidden in documentation.
- USAGE.md leads with a new "The one Firefox-specific thing to know first" section explaining F6 before any other content, and Step one of the audit walkthrough now names F6 explicitly instead of just acknowledging the focus stays on the page.

Chrome and Edge codebase is not touched by v5.3.6; both remain at v5.3.5 (Chrome live, Edge in certification).

Packages in `dist/`:
- `amasamya-firefox-v5.3.6.zip`

## Live on Chrome Web Store and addons.mozilla.org; in certification on Edge Add-ons: v5.3.5 (2026-09-17)

Two fixes.

**Edge and Firefox focus parity on Alt+Shift+1 (blocker).** Chrome's `chrome.sidePanel.open()` moves focus into the panel document automatically on open. Edge, despite sharing the Chromium sidePanel API, does not; Firefox's `browser.sidebarAction.open()` also opens the sidebar with focus still on the triggering page. A keyboard user pressing Alt+Shift+1 in Edge or Firefox saw the panel appear but their next Tab still cycled the underlying page controls. Panel.js now focuses the first tab (`#ptab-wcag`) on DOMContentLoaded with an 80 ms defer (which lets Chrome's own auto-focus settle first, so Chrome behaviour is preserved) and again on every `visibilitychange` to `visible` (so close-reopen cycles land correctly without needing a document reload).

**Version display reads the manifest at runtime.** The side-panel header, About section, and footer had the version string hardcoded in three separate places each and were still reading "v4.3" long after the extension had reached v5.3.4. Akhilesh observed the drift after v5.3.4 approved. The panel HTML now carries `[data-version-slot]` markers instead of hardcoded strings. Panel.js reads `chrome.runtime.getManifest().version` (Firefox falls back to `browser.runtime`) at load and writes it into every slot. From this release forward, bumping the manifest version is enough to update every user-visible version display in the panel; no more three-place edits.

Packages in `dist/`:
- `amasamya-extension-v5.3.5.zip` (CWS + Edge)
- `amasamya-firefox-v5.3.5.zip`

## Live on all three stores: v5.3.4 (Chrome + Firefox approved 2026-09-15 / 2026-09-16; Edge in review)

Small maintenance patch across all three extensions. Drops the "Learn in AMASAMYA Academy" row from the finding detail disclosure inside the results table. The Academy programme was retired on 2026-09-15 as part of the scope narrowing to product-only; the link at amasamya.akhileshmalani.com/academy.html now 301-redirects to the product home, so leaving the row in would send users through a redirect for no purpose.

The finding detail now contains: Element, Criterion, Computed, Required, How to Fix. That is what an engineer needs to fix the defect. No behaviour changes, no new permissions.

Packages in `dist/`:
- `amasamya-extension-v5.3.4.zip` (CWS + Edge)
- `amasamya-firefox-v5.3.4.zip`

## Firefox-only patch, live on addons.mozilla.org: v5.3.3 (approved 2026-09-10)

Firefox-only fixes. Chrome and Edge remain on v5.3.2 (their code does not need the same fix). Version alignment policy Option B permits per-store PATCH divergence.

Two bugs discovered in the Firefox add-on:

- **The manifest's suggested keyboard shortcut was `Ctrl+Shift+U`, which Firefox reserves** for View Source or Unicode input. Users reported it never worked. Manifest updated to `Alt+Shift+1` on all platforms, matching Chrome and Edge.
- **`background.js` called `chrome.sidePanel.open()` on toolbar-button click**, but `sidePanel` is a Chromium-only API. Firefox exposes the sidebar via `browser.sidebarAction.open()`. The try/catch silently swallowed the error so the sidebar never opened via keyboard or click. Fixed with a runtime check that prefers `browser.sidebarAction.open()` on Firefox and falls back gracefully.

Also new in v5.3.3, at the source level (not shipped in the package, ships with the repo):

- `amasamya-extension-firefox/USAGE.md` written for the addons.mozilla.org listing description and for direct reading. Screen-reader-first instructions covering install, run, navigate, export, and manual shortcut assignment. Covers Firefox's per-add-on quirk (sidebar limits, absence of the Visual Layout Auditor on Firefox because Firefox does not expose the `debugger` permission the way Chromium does).

Package sitting in `dist/`:
- `amasamya-firefox-v5.3.3.zip`

## Live on Chrome and Edge: v5.3.2 (built 2026-09-01; Chrome approved shortly after; Edge approved 2026-09-15). Firefox skipped this version in favour of v5.3.3 above.

Two additions on the findings-table results view, both driven by real
usage feedback from a blind NVDA/JAWS user:

- **Affected element surfaced in the row itself.** The finding row's
  aria-label now includes `Element: <selector>` so screen-reader row
  navigation announces the affected component in one breath. The
  disclosure button's visible text is prefixed `[selector]` so sighted
  users see it without expanding. Applies to Web Audit and Import on
  the platform, and to the findings table in both extensions.
- **Accessible PDF export.** New "Accessible PDF" button in the export
  toolbar. Opens the semantic HTML report in a new tab with an
  auto-triggered print dialog; the user picks "Save as PDF" as the
  destination. Chrome and Edge emit a tagged PDF with reading order
  and heading structure preserved. No third-party PDF library, no
  new permissions.

Packages sitting in `dist/`:
- `amasamya-extension-v5.3.2.zip` (CWS + Edge)
- `amasamya-firefox-v5.3.2.zip`

## Built, awaiting upload to all three stores: v5.3.1 (2026-08-31)

Patch release. No new features, no new permissions. Screen-reader-only
accessibility fixes on the findings-table row disclosure:

- **Stable detail id.** `<div id="detail-{f.id}">` (was `detail-{loop-index}`),
  so the aria-controls target no longer changes when the user filters or
  sorts the table.
- **Region role removed from per-row detail.** `role="region"` replaced with
  `role="group"`. Previously, expanding several finding rows added one
  landmark per row to the JAWS/NVDA landmark rotor, which made rotor
  navigation unusable. Row semantics now stay clean regardless of how many
  rows are expanded.

Packages sitting in `dist/`:
- `amasamya-extension-v5.3.1.zip` (same file works for both CWS and Edge Add-ons)
- `amasamya-firefox-v5.3.1.zip`

Version alignment (Option B): extension MAJOR.MINOR still matches platform
v5.3; PATCH may differ, and does here.

## Published across all three stores: v5.3.0 (2026-08-28)

v5.3.0 is live on Chrome Web Store (extension ID `blnfmiipkccpggpinjofhhglfcgglbif`), Microsoft Edge Add-ons (same Chromium package), and addons.mozilla.org as `amasamya-accessibility-audit` (Firefox port with `sidebar/` instead of `sidepanel/`, no `debugger` permission). Previously published versions v4.0.0 through v5.2.0 remain in each store's version history.

What v5.3.0 added over v5.2.0:
- GIGW 3.0 and IS 17802 India-national audit engines
- VPAT 2.4 ACR exporter (one-click compliance-document generation)
- Visual diffs on audit history

Permissions unchanged from v5.2.0; no new justifications were required at review time.

## Previously shipped: v5.2.0 "Scheduled Crawls"

Joint MAJOR.MINOR release with the AMASAMYA web platform (also v5.2.0).
Users of v4.3.1 who never create a schedule see no behaviour change; the
scheduler code is dormant until they configure a schedule from the
platform's new Schedules tab.

What ships in v5.2.0:

- **Schedules panel on the platform.** Full CRUD over per-user schedules
  stored in Firestore. Radio-group fieldsets for What-to-Crawl (URLs vs
  sitemap) and Frequency (daily / weekly-Monday / weekly-Friday), HH+MM
  number inputs for time, select for webhook type. Live regions
  (`sched-live-polite`, `sched-live-assertive`) route every state change
  through NVDA/JAWS concisely.
- **Chrome extension gains `alarms` permission.** Registers one
  `chrome.alarms` per enabled schedule, aligned to the user's local
  HH:MM. Alarms persist across service-worker eviction; the
  `onStartup` handler re-registers everything on browser boot.
- **Alarm-fire runs Site Crawl.** Invokes the existing v4.2.0 crawler
  via a new hooks interface (`onPageComplete`, `onComplete`). Backward-
  compatible: side-panel callers do not pass hooks and see identical
  behaviour.
- **Diff verdicts on every run.** Per-page, the scheduler fetches the
  URL's previous audit via `AMASAMYAAuditHistory.getPreviousAudit`,
  diffs against current findings via `AMASAMYAAuditDiff.diffAudits`,
  and accumulates `newFindings / regressedFindings / unchangedFindings
  / resolvedFindings` into the run summary. On per-URL diff failure,
  falls back to counting all current findings as `new` so the summary
  is never silently zero.
- **Webhook posting from `background.js`.** Slack incoming webhook
  (attachments with colour-coded fields), Teams MessageCard, or
  generic JSON payload shape. Colour picker: red when regressed > 0,
  amber when only new > 0, blue for clean runs.
- **Firestore run flush.** Run summaries live in `chrome.storage.local`
  under `amasamya_scheduled_runs_v52` (100-entry ring buffer). Each
  run has a `crypto.randomUUID`-generated `runId`. When a platform
  tab is open, the extension pushes unsynced runs; the platform
  writes each to `scheduledRuns/{runId}` using the runId as the doc
  ID (idempotent: duplicate `.set` on the same ID trips the deny-
  update rule and is treated as "already synced").
- **Missed-run replay on browser start.** `onStartup` awaits
  `reregisterAllAlarms` then serially replays any schedule whose
  `lastRunAt` is strictly earlier than `lastExpectedFire(schedule,
  now)`. One catch-up per missed schedule per startup.

Non-goals in v5.2.0 (deferred):

- End-to-end Playwright test with real Chrome + unpacked extension.
  Existing 23 scheduled-crawls unit tests (`accumulateTotals`,
  `buildWebhookPayload`, `lastExpectedFire`, `isMissed`) cover the
  algorithm; the wire between `chrome.alarms.onAlarm` and the
  scheduler is covered by first real schedule the user creates
  against their own site.
- Multi-webhook fan-out (one schedule -> multiple channels). Not
  requested. Add if users ask.
- Cron pattern beyond the three enum choices (daily / weekly-Monday /
  weekly-Friday). Hourly is out of scope for a browser-based scheduler
  (browser must be open); arbitrary weekdays add UI complexity for
  little marginal value.
- Cross-schedule dedup of shared URLs. Two schedules watching the same
  URL will double-audit. Fine at MVP scale.
- Timezone portability. Schedule fires in the local time of the
  machine where the extension is running at the moment. If the user
  travels, the schedule shifts. Matches calendar-app default.

## Published: v4.0.0, v4.0.1, v4.2.0, v4.3.0, v4.3.1 (historical)

## Version alignment policy with the AMASAMYA web platform (Option B)

Locked on 2026-07-09. The Chrome extension and the AMASAMYA web
platform (amasamya.akhileshmalani.com, `PLATFORM_VERSION` constant
in `amasamya/index.html`) share MAJOR.MINOR versioning. PATCH
versions can differ.

- **Feature or minor releases (x.Y)** are joint. Whenever either
  product bumps to a new MAJOR.MINOR, the other product bumps to
  match with real changes on its side. The joint release is one
  logical event even if the two commits land minutes apart.
- **Patch releases (x.y.Z)** are independent. A hotfix on the
  extension may ship as v5.2.1 while the platform stays on v5.2.0,
  and vice versa. This preserves hotfix agility.
- **Numerical parity target**: MAJOR.MINOR always matches. PATCH
  may drift up to two releases in either direction before we
  consciously realign.

Next joint MAJOR.MINOR release: **v5.2**. Both extension and
platform bump to 5.2 whenever the next planned feature ships. The
platform is already at 5.1.0 (formalised 2026-07-08); the
extension will jump from 4.3.1 to 5.2 at that time. The extension
jump is intentional and will be explained in its own commit as
"aligning with platform per Option B alignment policy".

Both Live on the Chrome Web Store. v4.0.0 shipped the 24 audit
engines, three Vision AI providers, Focus Indicator Narrator,
Visual Layout Auditor, State Change Watchdog, baseline regression
detection. v4.0.1 was the internal-audit patch pass (live-region
politeness, emoji noise removal, Redundant-Entry warning flood cap,
Dragging-Movements pre-filter, Mac shortcut text, summary cards
keyboard-focusable, main landmark programmatically focusable,
minimum_chrome_version 114).

## Shipped: v4.2.0 "Site Crawl"

Published on the Chrome Web Store 2026-07-01. Manifest at 4.2.0.
SITE_CRAWL_ENABLED flipped true in background.js and panel.js.
ZIP built at `dist/amasamya-extension-v4.2.0.zip` (127 KB, 26
entries). Uploaded 2026-07-01, approved same day.

What shipped in v4.2.0 (Site Crawl core):

- Crawl queue + concurrent audit runner module
  (engines/site-crawler.js). 3 pages in parallel by default.
- Sitemap.xml parser with sitemap-index recursion, 10 s fetch
  timeout, and 200-page hard cap
  (engines/sitemap-parser.js).
- Side-panel Site Crawl tab with paste-URLs (default) and
  sitemap input modes, start/cancel, live progress, per-page
  results table.
- Background service-worker driver that hooks audit results
  from injected pages and forwards per-page records to the
  platform tab when one is open.
- Platform-side Aggregated Reports mode with per-template
  grouping and drill-down to affected pages.
- Four crawl exports: HTML grouped report, CSV by template,
  CSV by page, JSON raw.
- Crawl session metadata header (start, finish, duration,
  per-status page counts) as a definition list for
  screen-reader navigation.
- Platform import of the crawl JSON shape, routed through the
  live ingest pipeline so imported sessions behave like live
  ones.

Post-upload polish pass (folded into the same submission before
publish):

- Crawler correctness sweep. Sitemap fetches now time out after
  10 s (AbortController), reject empty 200 responses with an
  actionable error, and recurse into sitemap-index trees deeper
  (depth 5, threshold 2000 URLs). Crawler distinguishes NO_RESPONSE
  from PASS so CSP-blocked pages no longer count as clean. Waiter
  race between content-script and the background-side awaitAudit
  waiter fixed by a per-tabId pending buffer. Cancel pre-empts the
  current waiter so it feels immediate. Findings shape validated at
  the platform bridge.
- Crawler concurrency. Runs 3 pages in parallel (was strictly
  serial); real-world wall time on a 32.5 s/page workload drops to
  ~3.5 s. Concurrency is tunable via start() options for sites that
  push back on parallel hits.
- Side-panel keyboard and screen-reader sweep. Tablist arrow-key
  hint moved out of `<ul>` and into an `sr-only` paragraph so
  aria-describedby actually resolves. Focus Narrator and Visual
  Layout Auditor progress: aria-live moved from the wrapper onto the
  persistent label so updates announce reliably. Finding-detail
  toggle now announces expanded/collapsed. Settings Save/Clear
  status text stays on screen instead of wiping at 3 s. Site Crawl
  URL fields (textarea + input) wrapped in `role="application"` so
  JAWS passes arrow keys straight to the field instead of ejecting
  focus to the virtual cursor. External About link announces "opens
  in a new tab".
- Focus trap. Panel now auto-focuses the currently selected tab on
  load (Chrome leaves focus on the toolbar after activation, which
  ejected the very first Tab press). Tab and Shift+Tab wrap within
  the panel instead of leaking to browser chrome.
- Close confirmation. Header Close button and Escape both raise a
  role="dialog" aria-modal="true" confirmation with Cancel focused
  by default. Guards against accidental Escape presses. Escape
  inside the confirm dialog cancels. Escape inside editable form
  fields is untouched.

Extension ID on the store remains
`blnfmiipkccpggpinjofhhglfcgglbif`. No user action needed on
install; the Alt+Shift+1 shortcut stays bound and the panel
queries chrome.commands.getAll() at load so any user whose
Chrome dropped the binding sees the correct fallback text.

Screen-reader specifics (retained across every crawl):

- Per-page completion announcements via the polite live region
  (for example "Page 3 complete. /checkout. Audited
  successfully. 5 findings. 2.4 seconds.").
- aria-valuetext on the progress bar reads as a sentence rather
  than a bare percent.

## Shipped: v4.3.0 "Audit Diff and History"

Published on the Chrome Web Store 2026-07-08. Manifest at 4.3.0.
Two new engine modules (`engines/audit-history.js` and
`engines/audit-diff.js`), full Playwright coverage (32 new tests,
132 passing overall at publish time; 133 including the
subsequent screen-reader.js double-read regression guard). ZIP
built at `dist/amasamya-extension-v4.3.0.zip`. Uploaded 2026-07-06,
approved 2026-07-08.

What ships in v4.3.0:

- On-device history storage. Every completed audit is saved to
  `chrome.storage.local` with per-URL bucketing, a 10-audit cap
  per URL (oldest evicted first), and an 8 MB total-storage soft
  cap with automatic eviction to a 6 MB target when over.
- URL normalisation for history keys. Fragments dropped, utm_*
  and common tracker params (`gclid`, `fbclid`, `mc_cid`, etc.)
  dropped, trailing slash on non-root paths dropped. Distinct
  query-driven pages remain distinct history buckets.
- Diff engine. Identity tuple `{engine, criterion, selector}`,
  exact match. Four verdicts: New, Regressed (Pass or Warning
  became Fail), Unchanged, Resolved (identity gone from current).
  Pure module, no I/O, tests-first.
- Auto-diff. The moment a URL has 2+ audits in history, the
  panel automatically renders the Change column, the diff
  summary card ("Compared to your last audit on 2026-07-01:
  N new, N regressed, N unchanged, N resolved."), and appends
  resolved rows to the bottom of the findings table.
- Screen-reader announcements. The complete-audit polite
  announcement now trails the diff summary sentence so JAWS/NVDA
  users hear the delta without navigating to it. Row-level
  aria-labels prepend the diff verdict word so it lands before
  the row's other columns are read.
- Diff CSV export. Toolbar button labelled "Diff CSV (new +
  regressed)" appears only when a diff view is active. Writes
  only the actionable rows in a format directly consumable as
  a ticket-import CSV. Filename encodes the compared-against
  timestamp so multiple exports do not overwrite.
- History section in the side panel. Collapsed by default. Two-
  column table (When, Findings) plus a Load button per row.
  Clicking Load swaps the current view to that historical audit
  and re-runs the diff against whatever came immediately before
  it. Current row is marked distinctly.
- History management. "Clear history for this URL" and "Clear
  all AMASAMYA history" buttons inside the History section.
  History is intentionally separate from baseline and API keys;
  clearing one does not touch the others.

Non-goals in v4.3.0 (deferred to v4.4.0 or later):

- Framework selector (React / Vue / Angular / vanilla). Adds
  real per-engine rule variation. Deferred so v4.3.0 ships now.
- Baseline promotion from history (right-click a past audit and
  set it as the baseline). Simple, deferred.
- Selector normalisation for stability against `:nth-child`
  drift. Reactive, based on real crawl signal. Deferred.
- Cross-URL diff (audit URL A vs audit URL B). Rarely useful,
  deferred.
- Cloud sync of history. Violates the no-backend promise.
  Not planned.

## Shipped: v4.3.1 quality-pass patch

Published on the Chrome Web Store 2026-07-09. Same-week same-brand
patch after v4.3.0. Closed ten real defects; no user-visible
feature changes.

- **Annotated PNG export was corrupted** (`sidepanel/panel.js:53`).
  downloadFile wrapped the base64 data-URL string as ASCII bytes.
  Fixed to decode base64 and use real bytes; URL.revokeObjectURL
  deferred by 60 s so slow disks / Firefox do not cancel the read.
- **announce() dropped rapid messages** (`sidepanel/panel.js:28`).
  Blind users were losing intermediate announcements when the
  crawl fired 4+ messages/second. Replaced 50 ms debounce with a
  per-politeness FIFO queue that drains one message at a time
  with a 600 ms dwell so AT can speak each before the next
  arrives. Bounded queue length (24) drops OLDEST polite messages
  under sustained flood; assertive is never dropped.
- **Crawl silently stole manual audits** (`background.js:383`).
  Prior heuristic ("sender.tab.active === false = crawler-owned")
  misrouted a user's own manual audit into the crawler if the
  user backgrounded their tab during a crawl. Replaced with an
  explicit Set of tabIds the crawler created.
- **Text-Spacing and Resize-Text engines could leave the user's
  page permanently zoomed or restyled** if any exception fired
  mid-audit. Wrapped both in try/finally.
- **parseLLMJson regex was non-greedy** (`background.js`), matched
  first inner object and returned useless payloads on any provider
  that wrapped results. Rewritten to match the outer JSON block.
- **Vision-AI finding verdicts miscounted on Gemini/OpenAI** because
  comparisons hard-cased against "FAIL" but those two providers
  regularly return lowercase. Normalised via .toUpperCase() at
  both count and render sites.
- **postMessage target changed from wildcard to location.origin**
  in the platform bridge so a cross-origin iframe on the platform
  page cannot receive audit findings.
- **baselineKey collided** on long e-commerce URLs sharing the
  first ~45 chars because it truncated btoa. Replaced with SHA-256
  hex; automatic one-time migration keeps existing baselines.
- **Message handler in panel.js and content-script-platform.js**
  now null-guards the message so an extension-context reload race
  cannot deliver undefined and kill the handler.
- **Dead code removed**: waitForTabLoad (uncalled listener leak),
  SITE_CRAWL_ENABLED constant and its `if (!SITE_CRAWL_ENABLED)`
  branches in three files.
- **Version strings synced** to 4.3.1 across manifest, TOOL_VERSION,
  panel.js JSON export, panel.js SARIF driver, panel.js HTML report
  footer, service-worker file header.

Tests updated: three site-crawl announcement tests that assumed
the old debounce contract now poll with `expect().toContainText()`
until the queued message arrives. Full suite 133/133.

## Next release: v4.4.0 - deferred v4.3.0 nice-to-haves

Build on top of the existing baseline feature so a user can see what
changed between any two audits of the same URL.

- New side-panel section: **History**.
- Stores the last 10 audits per URL in `chrome.storage.local` (capped
  by `chrome.storage.local.QUOTA_BYTES`, currently 10 MB).
- New verdict column: **New**, **Resolved**, **Unchanged**, **Regressed**.
- Diff is computed on `{engine, criterion, selector}` as the identity tuple.
- Export: diff CSV showing only New + Regressed rows, for engineer
  ticket creation.

Screen-reader specifics:

- The History list is a single-column table, sorted newest first.
- Each row is keyboard-activatable (Enter loads that audit as the
  current view).
- The diff itself uses the same findings-table pattern as the WCAG
  audit, so existing NVDA/JAWS muscle memory carries over.

## v4.2.0 - "Site Crawl" (audit a whole site in one shot)

Theme: developers and managers will not audit pages one at a time.
The hybrid architecture documented below keeps the crawl on the
user's device (preserves the no-backend privacy story) while moving
aggregation into the platform so the output is manager-readable.

### Architecture (hybrid: extension crawls, platform aggregates)

The extension acquires a URL list, walks it sequentially in the user's
already-authenticated browser session, runs the 24 engines on each
page, and forwards per-page findings to the platform over the existing
`content-script-platform.js` bridge. The platform's Reports panel
ingests per-page reports into a single aggregated view.

No server-side crawl. No new backend. The privacy policy stays valid
as written. CORS is bypassed because the audit happens inside the
user's browser session, not from `amasamya.akhileshmalani.com`.

### Authentication

In scope, but passively. The extension runs in the user's existing
browser session, so any site the user is signed into on Chrome is
also signed in when the crawler walks it. The extension does not
store credentials, does not handle multi-factor, does not replay
sessions. A page that redirects to a login screen mid-crawl is
logged as "auth wall" and skipped, not retried.

### URL list source (v1 ships with two, defers the third)

1. **`sitemap.xml` ingestion** (v1): user enters the site root,
   crawler fetches `/sitemap.xml`, parses it, walks every URL listed.
   Covers most marketing and content sites.
2. **User-pasted URL list** (v1): textarea, one URL per line. The
   escape hatch when sitemap is missing, gated, or wrong.
3. **Recursive link following** (v4.2.1 or v4.3): start at one URL
   and follow internal `<a href>` links to a configurable depth.
   Deferred because cycle detection, query-string deduplication, and
   "trap" pages (infinite calendars, infinite scroll) need real
   calibration before shipping.

### Cap per run

200 pages in v1. Hard cap enforced both in code and in the UI,
never silent truncation. A 200-page crawl is roughly 7 to 13
minutes wall time. Push to 500 in v4.3 only if real users hit
the limit.

### Output

The platform's Reports panel gains an **Aggregated** mode that
groups findings by `{engine, criterion, selector pattern}` and
reports "this issue appears on N of M pages". Per-page detail
remains accessible by drilling into the group. Export formats
extend to include "by template" and "by page" views.

### Privacy implications

None. The crawl runs in the user's browser session. Findings are
forwarded to the platform via the existing content-script-platform
bridge that the user already trusts. No new data leaves the device
that does not already leave it today.

### Acceptance criteria

- Sitemap-driven crawl of a 100-page WordPress site completes
  cleanly with no hung tabs.
- Aggregated report identifies template-level issues (one finding
  per template, not 100 duplicates).
- Auth-walled pages are clearly labelled as skipped, not as Pass.
- Memory: no Chrome tab over 200 MB during a 200-page crawl.
- Cancellable mid-run with a clean partial report.

## v5.0 - "Privacy-first"

Target window: 4 to 6 weeks after v4.2 ships, assuming the
intermediate releases stabilise.

### v5.0 - Item 1: Offline-only mode

Run Focus Indicator Narrator and Visual Layout Auditor without any
external API call.

- Bundle a CV pipeline that detects focus-ring presence, focus-ring
  contrast against the underlying pixels, and visual occlusion or
  clipping at each emulated breakpoint.
- Use OpenCV.js (or tract-onnx if the WASM size becomes a Chrome Web
  Store reviewer concern) plus a small pre-trained classifier shipped
  inside the extension.
- New setting: **Privacy mode**. When on, the extension never makes a
  network request. When off, behaviour is unchanged (Vision AI path).
- Privacy mode is the default for users who have not configured any
  Vision AI key on first run.

Acceptance criteria:

- Offline path agrees with at least one Vision AI provider on at
  least 85% of focus-indicator findings across the benchmark fixture
  set (`test-fixtures/focus-benchmark/`).
- Total ZIP size under 6 MB after WASM and model files (Chrome Web
  Store soft cap is 10 MB; below 6 MB avoids reviewer pushback).
- No telemetry of any kind in privacy mode.

This is the most architecturally invasive feature on the roadmap and
gets its own release line for that reason.

## Separate product: AMASAMYA CLI

Not part of the extension. Tracked here for visibility only.

- New repo: `AMASAMYA/amasamya-cli`.
- `npm install -g @amasamya/cli`.
- Wraps the same engine modules (post-refactor in v4.0 to make them
  environment-agnostic) and runs them under Puppeteer or Playwright
  against a URL list.
- Emits SARIF 2.1.0 (for GitHub Code Scanning) and JUnit XML (for
  generic CI consumers).
- Target window: after v5.0 ships, once engines are stable.

## Explicitly deferred or dropped

These were considered and are not currently planned. Recorded here so
the next person reading this file does not re-propose them.

| Item | Status | Reason |
|---|---|---|
| Screen-reader narration recorder | Dropped | Would ship "what NVDA *probably* says", which is unverifiable without a real screen reader. Shipping an approximation to a blind audience is the wrong trade. Revisit only if a real tester asks for it by name. |
| iOS / Android companion app | Deferred indefinitely | Out of scope for a desktop browser extension. |
| Self-hosted Vision AI proxy | Deferred | Solved by v5.0 offline mode instead. |
| Browser support beyond Chromium | Deferred | Firefox add-on uses a meaningfully different API surface (no `chrome.sidePanel`, different `chrome.debugger` semantics). Re-evaluate after v5.0. |

## How this file changes

Update the **Last reviewed** date at the top of the file every time
this roadmap is revisited. Move shipped items into a `## Shipped`
section at the bottom (to be created on first promotion) rather than
deleting them, so anyone reading the file can see the trajectory.
