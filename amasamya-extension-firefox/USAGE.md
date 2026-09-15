AMASAMYA ACCESSIBILITY AUDIT, FIREFOX ADD-ON
USER GUIDE FOR SIGHTED AND SCREEN-READER USERS


WHAT THIS ADD-ON DOES

AMASAMYA is an accessibility audit tool for the current web page. When you run an audit, the add-on scans the page against WCAG 2.2, GIGW 3.0, and IS 17802 rules, and shows the results in a Firefox sidebar. Every result row is keyboard operable, every state change is announced via a polite or assertive screen-reader live region, and the results table exposes the affected element in each row's aria-label so you hear which component failed without expanding the row.


HOW TO INSTALL

Open the add-on's page on addons.mozilla.org: https://addons.mozilla.org/en-US/firefox/addon/amasamya-accessibility-audit/

Activate the Add to Firefox button. Firefox will ask you to confirm the permissions. Confirm.

The AMASAMYA button appears in the Firefox toolbar. Your screen reader announces "AMASAMYA Audit Results, button" when it gets focus.


HOW TO RUN AN AUDIT, WITH THE KEYBOARD

Method one, the fastest, Alt plus Shift plus 1:

Press Alt plus Shift plus 1 on the page you want to audit. The sidebar opens and the audit runs on the current page.

If the shortcut does not work, Firefox may not have auto-assigned it. Go to about:addons, activate the Extensions tab, activate the tools menu next to Manage Your Extensions, and pick Manage Extension Shortcuts. Find AMASAMYA in the list, and set the shortcut for "Run AMASAMYA accessibility audit on the current page" to Alt plus Shift plus 1 (or any combination you prefer that Firefox accepts).

Method two, keyboard equivalent of activating the toolbar button:

Press F6 to move focus from the page to the browser chrome. Repeat F6 until your screen reader announces the extensions toolbar or the AMASAMYA button by name. Press Enter. The sidebar opens and the audit runs.

Method three, right-click on the AMASAMYA button:

Focus the AMASAMYA button in the toolbar. Press the Applications key (or Shift plus F10) to open the context menu. Choose Manage Extension to reach the settings page for the add-on.


HOW A SCREEN READER USES THE ADD-ON

Screen reader tested: NVDA and JAWS on Windows Firefox 128 ESR and later.

Sequence of what you hear when you press Alt plus Shift plus 1 on a web page:

Step one. Firefox opens the sidebar. Focus stays on the page's active element (Firefox behaviour, not something the add-on controls).

Step two. The audit runs. The sidebar's polite live region announces: "Audit running on [page title]. Please wait." within 1 second.

Step three. The audit completes. The polite live region announces: "Audit complete. N findings. M failures, K warnings." Typically 2 to 8 seconds after the audit starts.

Step four. Press F6 to move focus into the sidebar. Your screen reader announces the sidebar's landmark and the first heading, which is the summary card for Failures.

Step five. Use H (in browse mode) or arrow keys to navigate through the summary cards (Failures, Warnings, Passes, Info, Total) and then into the Findings table.

Step six. In the Findings table, use table-navigation shortcuts (Ctrl plus Alt plus arrow keys in NVDA and JAWS) to move cell by cell. Each row's aria-label includes the finding ID, engine, verdict, severity, issue, and affected element (a CSS selector). So arrowing down rows tells you which component failed without expanding the row.

Step seven. To expand a finding for full detail, land on the "More detail" button in the row and press Enter or Space. The screen reader announces "Finding detail expanded" and you can Tab into the expanded content to read Element, Criterion, Computed, Required, and How to Fix.

Step eight. To export the report, activate one of the Export buttons in the Export toolbar: JSON, HTML, Accessible PDF, CSV, or Text. The Accessible PDF opens a print-ready report in a new tab and auto-triggers the print dialog. Choose Save as PDF as the destination.


TABS AND LANDMARKS INSIDE THE SIDEBAR

The sidebar has four panels reachable via the tab strip at the top:

Panel one, WCAG. The default. Shows the findings table, filters, and export toolbar.

Panel two, Visual. Shows the Visual Layout Auditor results. Note that on Firefox this panel is limited compared to Chrome, because Firefox does not expose the debugger permission the way Chromium browsers do. Some visual checks are skipped.

Panel three, Settings. Contains the extension's configuration.

Panel four, Site Crawl. Shows the site-wide crawl results if you have run a crawl.

Landmarks inside the sidebar: main content, tab list, the export toolbar, the findings table region, and the polite and assertive live regions.


KEYBOARD SHORTCUTS SUMMARY

Alt plus Shift plus 1. Run the audit on the current page. Opens the sidebar and starts the scan.

F6. Move focus between the page and the browser chrome.

Tab and Shift plus Tab. Move between interactive elements inside the sidebar.

Ctrl plus Alt plus arrow keys (NVDA and JAWS). Move cell by cell inside the findings table.

Space or Enter on a finding row's More detail button. Expand or collapse the row's detail.

Alt plus PageUp and Alt plus PageDown inside the sidebar (Firefox default). Switch between the four panels.

Escape. Does not close the sidebar. To close the sidebar, activate the AMASAMYA toolbar button again (or press Alt plus Shift plus 1 again if that is your shortcut).


IF THE SHORTCUT DOES NOT WORK ON YOUR FIREFOX

Firefox may not automatically pick up the manifest's suggested shortcut if you installed the add-on before v5.3.3, or if another add-on already claims Alt plus Shift plus 1.

To assign the shortcut manually:

Open about:addons.
Activate the Extensions tab in the left navigation.
Activate the tools menu near the top (the gear icon on the sighted layout is labelled "Tools for all add-ons" for your screen reader).
Activate the Manage Extension Shortcuts item.
Find AMASAMYA in the list.
For the "Run AMASAMYA accessibility audit on the current page" command, activate the shortcut input.
Press Alt plus Shift plus 1. The input records the combination.
Close the Manage Extension Shortcuts page.

The shortcut now works.


IF THE ADD-ON DOES NOT RUN ON A PAGE

The add-on cannot audit pages served from Firefox internal URLs (about:, moz-extension:, resource:, view-source:, or the Firefox add-on store itself). If you try to run an audit on one of these, the polite live region announces the reason.

To audit an internal page, save the rendered HTML to a file, host it on a local server (or as a data URL), and audit that.


REPORT A BUG OR SEND FEEDBACK

Email akhilesh@amasamya.com. Include the page URL, the screen reader and Firefox version, and the exact keyboard step that produced the problem. Screenshots are optional; a text description of what the screen reader said (or did not say) is more useful.


CREDITS

Built by Akhilesh Malani, a blind accessibility architect. Every keyboard flow and every screen-reader announcement in this add-on was tested by the author using NVDA and JAWS on Windows Firefox before shipping.
