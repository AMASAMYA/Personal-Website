STORE LISTING COPY, COMPACT VERSIONS UNDER 3000 CHARACTERS
FOR addons.mozilla.org SUBMISSION FIELDS

Update AMASAMYA_LATEST at the top of the release-notes and reviewer-notes sections when a new release ships. The how-to-use section below is evergreen.


VERSION 5.4.0 RELEASE NOTES, PASTE INTO "RELEASE NOTES FOR THIS VERSION"

v5.4.0 ships the new Interaction Sweep engine. Four runtime detectors that static accessibility rules cannot catch.

One. Focus-accept sweep. Focuses every element in tab order and flags any that decline. Catches SPA route transitions where an element is still in the tab order after its ancestor has unmounted.

Two. Focus-indicator sweep. Snapshots outline, box-shadow, border, and background before and after focus. No change means no visible focus indicator. Catches sites shipping outline zero via utility CSS without a focus-visible fallback.

Three. Keyboard-trap sweep. Focuses each element, dispatches synthetic Tab, Shift plus Tab, and Escape, and flags any handler in the propagation path that calls preventDefault. Catches modal focus traps and Escape-swallowing dialogs.

Four. Unreachable-clickable sweep. Finds cursor-pointer or onclick elements that are not natively focusable, have no focusable role, and no tabindex zero or higher. Mouse users can click them; keyboard users are locked out.

Triggered by a real-user report on 2026-09-29 that neither AMASAMYA nor any other automated auditor flagged a public government site as inaccessible despite the site being unusable with NVDA and JAWS. Root cause was architectural: every static rule engine looks at the DOM at one point in time. Interaction Sweep observes runtime behaviour.

No new permissions. No new host permissions. No API surface changes.


VERSION 5.4.0 REVIEWER NOTES, PASTE INTO "NOTES TO REVIEWER"

Feature release. Manifest bumped 5.3.5 (Firefox last live) to 5.4.0. One new engine file (engines/interaction-sweep.js, 506 lines), one new engines array entry in content-script.js, and one line change in background.js that adds engines/interaction-sweep.js to the executeScript files list so the global self.AMASAMYAInteractionSweep is defined before content-script.js references it.

The engine dispatches synthetic KeyboardEvent objects on focused elements to detect preventDefault behaviour in keydown handlers. Synthetic events do not trigger native browser behaviour (only trusted user events do), so this sweep does not move focus, does not navigate the page, and does not open menus. It only observes whether any application-code keydown handler in the propagation path calls preventDefault, which is the mechanism modal focus traps use.

The engine also calls .focus() with preventScroll: true on each focusable element and reads document.activeElement to verify the focus took. Original activeElement is restored in a finally path so the user's own place on the page is preserved.

No new permissions, no new host permissions, no fetch to remote endpoints, no new content-security-policy directives, no new manifest keys. Same permission set as v5.3.5.


VERSION 5.3.6 RELEASE NOTES, KEPT FOR REFERENCE

v5.3.6 Firefox-only patch, Mozilla bug 1319368 workaround.

Firefox blocks a sidebar extension from moving focus to itself, so v5.3.5's shared focus-on-open handler silently no-ops on Firefox. v5.3.6 adds three mitigations: a window.focus() call before the element focus (best-effort), a permanent visible instruction under the panel header telling users to press F6, and a new leading section in USAGE.md that explains F6 before any other content.

No new permissions.


VERSION 5.3.3 RELEASE NOTES, KEPT FOR REFERENCE

v5.3.3 Firefox-only patch, two bugs fixed.

One. The suggested keyboard shortcut in the manifest was Ctrl plus Shift plus U, which Firefox reserves. Users reported it never worked. Now Alt plus Shift plus 1, matching Chrome and Edge.

Two. background.js called chrome.sidePanel.open on toolbar-button click, which is a Chromium-only API and silently failed on Firefox, so the sidebar never opened. Now uses browser.sidebarAction.open.

No new permissions.


COMPACT HOW-TO-USE FOR THE "ABOUT THIS EXTENSION" DESCRIPTION FIELD

Character count: 2,691.

AMASAMYA is an accessibility audit tool for the current web page. It audits against WCAG 2.2, GIGW 3.0, and IS 17802. Built by a blind screen-reader user for accessibility teams that ship the fixes.

HOW TO RUN AN AUDIT

Press Alt plus Shift plus 1 on any web page. The sidebar opens and the audit runs on the current page.

If the shortcut does not work on your Firefox, open about:addons, go to the Extensions tab, activate the Manage Extension Shortcuts option in the tools menu, find AMASAMYA in the list, and assign Alt plus Shift plus 1 (or any combination you prefer) to the command Run AMASAMYA accessibility audit on the current page.

WHAT YOUR SCREEN READER HEARS

Step one. Press Alt plus Shift plus 1. The sidebar opens. A polite live-region announcement fires within 1 second: Audit running.

Step two. When the audit completes, the polite live region announces: Audit complete. N findings. M failures, K warnings.

Step three. Press F6 to move focus into the sidebar. Your screen reader announces the sidebar landmark and the first heading.

Step four. Navigate the results table with your screen reader's table shortcuts (Ctrl plus Alt plus arrow keys in NVDA and JAWS). Each row's aria-label includes the finding ID, engine, verdict, severity, issue, and the affected component (a CSS selector), so you hear which element failed without expanding the row.

Step five. Activate the More detail button in any row (Enter or Space) to expand the row's full context: Element, Criterion, Computed, Required, and How to Fix.

Step six. Export the report using one of the buttons in the export toolbar: JSON, HTML, Accessible PDF (opens a print-ready report in a new tab with an auto-triggered print dialog for Save as PDF), CSV, or Text.

WHAT DOES NOT WORK

Firefox internal URLs (about:, moz-extension:, resource:, view-source:) cannot be audited by any add-on. If you try, the polite live region announces the reason.

The Visual Layout Auditor panel is limited on Firefox because Firefox does not expose the debugger permission the way Chromium does. Some visual checks are skipped.

FULL DOCUMENTATION AND FEEDBACK

Full screen-reader-first user guide with landmark structure, panel tour, and troubleshooting: https://github.com/AMASAMYA/AMASAMYA/blob/main/amasamya-extension-firefox/USAGE.md

Send bugs and feedback to akhilesh at amasamya dot com. Include the page URL, your screen reader and Firefox version, and the exact step that produced the problem.

Built by Akhilesh Malani, blind accessibility architect. NVDA and JAWS tested before every release.


NOTES FOR THE REVIEWER, IF THE STORE ASKS

No account required for the core audit feature. Test on any public web page. Test screen readers: NVDA on Windows Firefox 128 ESR and later. Prior submission test URLs still apply.

Character count: 291.


END OF STORE LISTING COPY.
