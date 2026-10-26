Cross-browser parity verification: per-release checklist

Purpose
=======

Verify that every AMASAMYA extension feature behaves the same on
Chrome, Microsoft Edge, and Firefox before approving the three store
uploads. Chrome and Edge share one Chromium codebase in
amasamya-extension/; Firefox is a separate codebase in
amasamya-extension-firefox/ with real API differences. Shipping the
Chromium ZIP to the Chrome and Edge stores does not prove parity: Edge
has its own a11y provider quirks and its own side-panel focus
behaviour, and the Firefox codebase has its own history of bugs that
do not show up in Chromium testing.

Why this exists
===============

The last three release cycles shipped new runtime detectors
(Interaction Sweep in v5.4.0), new store copy (v5.4.1 plain-English
rewrite), and infrastructure changes (URL migration in v5.4.3) without
a structured per-browser verification pass. Issues that only surface
on Edge or Firefox become support tickets instead of release-blockers.
This checklist takes about 90 minutes end to end and runs before every
minor-release store upload.

Scope
=====

Three browsers. For Chrome and Edge the extension source is identical
(amasamya-extension/, Chromium manifest V3, side-panel API, debugger
permission). For Firefox the source is amasamya-extension-firefox/
with WebExtensions V3, sidebarAction API, NO debugger permission, and
the Mozilla bug 1319368 mitigations in place.

Known architectural gaps that are NOT parity failures:

- Visual Layout Auditor is Chrome and Edge only. Firefox has no
  debugger permission and the feature is intentionally absent there.
  Do not log this as a failure; it is a documented design choice.
- Firefox opens the sidebar through browser.sidebarAction.open();
  Chrome and Edge use chrome.sidePanel.open(). The user-visible
  shortcut (Alt+Shift+1) is the same, but the keyboard reach into the
  panel on Firefox goes through F6 with specific window.focus()
  mitigations, documented in USAGE.md.

Everything else should match. If Firefox announces different text, or
reports different finding counts for the same page, or exports a
different JSON shape, that is a parity failure.

Prerequisites
=============

- All three browsers installed and signed into any syncing account
  that matches your usual workflow.
- The extension installed from the store (not the local dev build) in
  each browser so you are testing what users receive.
- NVDA 2023.1 or newer running (both the extension and this
  checklist are blind-first; sighted-only verification is not enough).
- One test page that produces a mixed-severity audit so every detector
  has something to report. YouTube's home page and the Flipkart home
  page both work; pick the same page for all three browsers in a
  single sweep so counts are directly comparable.

Procedure matrix
================

For each row, perform the per-browser steps in order and record the
outcome in the results table at the bottom of this file. Use the
pass / partial / fail wording in the Verdict column.

A. Panel opens on the shortcut
------------------------------
Test: Press Alt+Shift+1 on any ordinary web page.
Pass criteria: NVDA announces that the AMASAMYA panel is now open
(Chrome: "AMASAMYA Audit Panel document"; Edge same; Firefox:
"AMASAMYA Audit Panel sidebar"). Focus does NOT need to move into
the panel; the panel just needs to be visible and reachable with F6.
Firefox gotcha: if the panel does not open on the first keystroke,
check that the sidebar is enabled under Firefox's View menu once per
install.

B. F6 reaches the panel
-----------------------
Test: With the panel open, press F6 from the content area. Repeat
F6 presses as needed.
Pass criteria: One or more F6 presses lands focus inside the panel
and NVDA announces an element inside it. Count the number of F6
presses required and record it.
Firefox gotcha: Mozilla bug 1319368 is why USAGE.md leads with the
F6 explanation. If Firefox takes more than three F6 presses, log
partial.

C. Interaction Sweep fires its four runtime detectors
-----------------------------------------------------
Test: Run the audit against a known-failing page (Flipkart home or
YouTube home). After the audit finishes, filter the findings table by
Engine column to "Interaction Sweep".
Pass criteria: Four detector classes present in the Interaction
Sweep output: focus-accept, focus-indicator, keyboard-trap,
unreachable-clickable. Numeric counts within each class need NOT
match across browsers (DOM differs), but all four categories must be
represented.
Firefox gotcha: the focus-indicator detector was rewritten as static
CSS analysis in v5.4.1 to kill the npci.org.in false positives. It
should fire on Firefox too; if it does not, log fail.

D. Site Crawl queues and completes
----------------------------------
Test: Open the Site Crawl tab. Enter a two-URL seed list (the test
page URL and one other page on the same origin). Set max pages to 2.
Activate Start.
Pass criteria: Both URLs process without an uncaught error. The
Aggregated Reports section shows two per-URL rows and a combined
total. Keyboard focus does not get trapped.
Firefox gotcha: Site Crawl was ported to the sidebar codebase; verify
the role="application" URL fields accept JAWS arrow-key input even
though you are testing with NVDA (JAWS parity is the design
constraint; NVDA just has to not break).

E. Audit History + Diff shows prior runs
----------------------------------------
Test: Run an audit on the same page twice with at least one setting
change between runs (change the Severity filter or re-order).
Open the Audit History section.
Pass criteria: Two rows appear. Load the older row; the Diff output
reports which findings are new, resolved, unchanged, and changed
(four-verdict diff engine). Diff CSV export produces a non-empty file.

F. Scheduled Crawls can register (do not actually fire)
-------------------------------------------------------
Test: Open the Settings tab. Configure one scheduled crawl for 24
hours out. Save.
Pass criteria: The schedule is listed in the UI and persists after
reloading the panel. Do NOT wait 24 hours; this is a registration
check only.
Firefox gotcha: Firefox uses browser.alarms with the same API shape
as Chrome; schedule persistence should work. If the schedule
disappears after reload, log fail.

G. Export produces identical JSON shape
---------------------------------------
Test: Run the same audit on the same page in each browser. Export
JSON. Compare the top-level shape (field names and nesting) across
the three files.
Pass criteria: Field names identical. Finding count may differ by up
to about 10% between Chromium and Firefox because of DOM-exposure
differences in the two engines; count differences above 20% are a
parity failure and need investigation.

H. Finding clustering collapses duplicates
------------------------------------------
Test: Run the audit against a known-high-dup page (any page with a
long product grid; Flipkart works). Count how many "Affects N
elements on this page" cluster rows appear.
Pass criteria: Clustering fires on all three browsers. The N values
may differ, but no browser should show the raw unclustered list that
v5.4.0 produced before this pass was added.

I. VPAT 2.4 ACR export completes
--------------------------------
Test: After an audit, activate the VPAT export button.
Pass criteria: A VPAT 2.4-shaped document downloads on each browser.
Open it, verify the WCAG 2.2 clause table is populated with the
audit's findings mapped to each clause.

J. Panel version string matches the manifest
--------------------------------------------
Test: Open the panel. Read the version string shown under the brand
header (the v0.2.9 NVDA diagnostic dumped it as "v5.4.3" during the
YouTube test).
Pass criteria: The displayed version matches the manifest version
on all three browsers. v5.3.5 fixed the hardcoded-version bug; this
check confirms it has not regressed.

Results template
================

Copy this table into Test Reports/parity/v<version>-<YYYY-MM-DD>.md
after a sweep. Mark each cell pass, partial, or fail. Add a one-line
note for every partial or fail.

| Test | Chrome | Edge | Firefox | Notes |
|---|---|---|---|---|
| A. Panel opens on shortcut |  |  |  |  |
| B. F6 reaches the panel |  |  |  |  |
| C. Interaction Sweep four detectors |  |  |  |  |
| D. Site Crawl queues and completes |  |  |  |  |
| E. Audit History + Diff |  |  |  |  |
| F. Scheduled Crawls register |  |  |  |  |
| G. Export JSON shape |  |  |  |  |
| H. Finding clustering |  |  |  |  |
| I. VPAT 2.4 ACR export |  |  |  |  |
| J. Panel version string |  |  |  |  |

Release gate
============

No store upload if any cell is "fail". A "partial" is allowed to ship
only if it is accompanied by a known-issue note in the store listing's
release description. Three or more partials in one browser blocks the
upload for that browser pending investigation.

Cadence
=======

Every minor release before the three store uploads. The sweep is
cheap compared to a store review-cycle rework when Firefox users
report an issue the Chromium build never had.
