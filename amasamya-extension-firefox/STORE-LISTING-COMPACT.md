STORE LISTING COPY, COMPACT VERSIONS UNDER 3000 CHARACTERS
FOR addons.mozilla.org SUBMISSION FIELDS


VERSION 5.3.3 RELEASE NOTES, PASTE INTO "RELEASE NOTES FOR THIS VERSION"

Character count: 462.

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
