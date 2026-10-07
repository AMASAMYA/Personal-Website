# AMASAMYA NVDA Add-on Roadmap

Last reviewed: 2026-10-07 (v0.2.1 shipped: v0.2.0 shortcuts (NVDA+Shift+<letter>) clashed with user setup, replaced with dual bindings. Every script now reachable via NVDA+Alt+<letter> single-stroke AND via NVDA+A layer command. Phase 3 bidirectional native-messaging bridge is the next planned release. Not yet submitted to the NVDA Community Add-ons Store; submission still waiting for Akhilesh's sign-off on the Phase 2 UX after live NVDA testing).

Scaffolded 2026-10-07 as a new AMASAMYA product surface alongside the three browser extensions and the Android app. Full architectural reasoning in memory/project-nvda-addon.md.

Versioning: this add-on starts at v0.1.0 and develops independently. It does NOT follow the Option B MAJOR.MINOR alignment that binds the browser extensions and the web platform. Revisit alignment only when Phase 3 ships and the NVDA add-on reaches feature parity with the browser extensions.

## v0.1.0 (2026-10-07) - Scaffold + one script

Shipped:
- manifest.ini with name, summary, description, author, version, min/last-tested NVDA versions.
- addon/globalPlugins/amasamya.py: single globalPlugin class with one script bound to NVDA+Shift+A.
- The script detects whether Chrome, Edge, Firefox, Brave, or Opera is the foreground window, walks the UIA tree looking for any object named with the "AMASAMYA" prefix (matches the extension side-panel titles), and speaks either "AMASAMYA panel is open on PAGE_TITLE" or "AMASAMYA panel is not visible, press Alt plus Shift plus 1".
- addon/doc/en/readme.md with install, usage, uninstall, and the next-versions roadmap in plain English for the NVDA community audience.

Not yet in this version:
- SCons build config (buildVars.py + sconstruct). The current scaffold is zip-ready as-is; building via SCons is only needed for Community Add-ons Store submission in a later version.
- Localisation. English only.
- Automated tests. The NVDA Python API is hard to test outside NVDA itself; we will add a smoke-test harness in Phase 2 if the surface warrants it.
- A website product entry on amasamya.com. The browser-extension pillars dominate that page; the NVDA add-on gets added to the install options once Phase 2 lands.

Packaging today is a hand-zipped `.nvda-addon` file. Create one by zipping the contents of `amasamya-nvda-addon/` (not the directory itself, the contents) into `dist/amasamya-nvda-addon-0.1.0.nvda-addon`. The manifest.ini and addon/ folder must sit at the root of the ZIP.

## v0.2.1 (2026-10-07) - Dual gesture bindings

Akhilesh reported the v0.2.0 shortcuts (NVDA+Shift+<letter>) clashed with existing bindings on his setup. Rather than guess which specific combos were safe, v0.2.1 ships two independent binding schemes simultaneously so a user can pick whichever one fits their NVDA installation.

Path 1: single-stroke Alt-modifier.
  NVDA+Alt+A, +N, +P, +F, +U.
  Fastest. Safe for setups that have no NVDA+Alt bindings in use.

Path 2: layer command.
  NVDA+A enters a 2-second listening window. The layer entry announces "AMASAMYA layer. A panel, N next, P previous, F fix, U summary." so a first-time user hears their options without looking anything up. Within two seconds, pressing A, N, P, F, or U runs the corresponding script. Any other keystroke or the two-second timeout cancels silently; a second NVDA+A cancels immediately. Zero conflict risk because the single-letter keys only mean anything inside the layer.

Both paths run the same five underlying scripts. getScript() on the GlobalPlugin is overridden to intercept bare-letter keyboard gestures while _in_layer is True and dispatch to the matching script method directly; non-matching gestures cancel the layer and fall through to normal NVDA processing. The timeout runs on a threading.Timer and is cancelled whenever the layer exits for any reason.

NVDA+A as the layer trigger is NOT a documented NVDA default and should be free on a stock installation. If a user has rebound it, they can rebind the layer entry through NVDA's Input Gestures dialog like any other script. The dual-binding scheme means losing either path still leaves the other working.

## v0.2.0 (2026-10-07, superseded by v0.2.1) - Panel navigation scripts shipped

Four new scripts added, all under the "AMASAMYA" scriptCategory so users rebind cleanly if any gesture conflicts. All five scripts (including the Phase 1 one) now live in addon/globalPlugins/amasamya.py.

- NVDA+Shift+N: next failure. Walks the panel's findings-table rows via a bounded UIA descendant iterator, filters to rows whose accessible name contains "Critical" or "Serious", finds the first one after the current navigator position, sets the navigator object (does NOT change focus; focus-stealing is jarring mid-audit for a blind user), speaks a short "N of M failures" position cue followed by the row name.
- NVDA+Shift+P: previous failure. Same mechanism, reverse direction.
- NVDA+Shift+F: read current finding's fix. Looks for a child or descendant of the current navigator row whose accessible name starts with "Fix" or "How to Fix", extracts the text after the colon, speaks it. If no fix is found, nudges the user to activate the row with NVDA+NumpadEnter so the disclosure opens.
- NVDA+Shift+U: speak audit summary. Scans the panel for objects named "Failures:", "Warnings:", "Passes:", "Info:", parses the integer that follows each colon, builds one short sentence in all-lowercase label form ("3 failures, 2 warnings, 48 passes, 1 info.") that fits a 40-cell Braille display.

Blind-first implementation choices locked in:
- Every announcement goes through ui.message() so NVDA fans output to speech AND the user's Braille display in the same call.
- Every message is kept short (one or two sentences, under 180 characters) so it is legible on a 40-cell Braille display without hunting.
- The navigator object is set via api.setNavigatorObject(), focus is never taken, keyboard focus stays wherever the user put it.
- All five scripts guard against unsupported browsers, missing panel, missing findings, and missing navigator position, with specific user-facing recovery hints in each error case.

Technical state and risks:
- Fallback-tolerant: every try/except around UIA access returns None/empty rather than throwing. SPAs mutate the DOM frequently and object navigation can throw at any step; the add-on degrades gracefully rather than crashing NVDA.
- Still needs live NVDA testing against the real AMASAMYA panel on all three browsers. Chrome and Edge should behave identically (same Chromium side panel); Firefox's XUL sidebar may surface a different tree shape. If a specific row-detection or summary-parse fails in practice, the parser (_find_findings_rows, _row_severity, _read_summary_counts) is the first place to look.
- The "Fix" text parser assumes the panel exposes the How-to-Fix cell with a name beginning with "Fix" or "How to Fix". If panel.html rewording ever changes that prefix, the parser needs an update; keeping this annotation here so the next session that touches the panel copy remembers to check this parser.

Not yet in this version:
- SCons build config. Still sideload-only; v0.3.0 or the first Community Add-ons Store submission will add it.
- Localisation. English only still.
- Automated tests. Harder than it looks: the UIA tree can only be tested against real NVDA. A later version may add a mock-NVDAObject harness for the pure-Python helpers.

## v0.3 - Native-messaging bridge (planned, needs browser-extension changes)

Depends on:
- `nativeMessaging` permission added to amasamya-extension/manifest.json and amasamya-extension-firefox/manifest.json. This is a new user-facing permission on all three stores and triggers one more review cycle each.
- A native-host JSON file registered at NVDA-add-on install time. installTasks.py in the add-on writes the file to the Chromium-expected path (per-user: %LocalAppData%\Google\Chrome\User Data\NativeMessagingHosts\amasamya.json) and the Firefox-expected path (per-user: %AppData%\Mozilla\NativeMessagingHosts\amasamya.json). Each JSON points at a Python script bundled inside the add-on.
- A Python companion script in the add-on that opens stdin/stdout, decodes Chrome's length-prefixed JSON messages, forwards audit requests to the AMASAMYA Python runtime, and streams findings back.

User-facing shape when it ships:
- NVDA+Shift+R, run from any browser tab, triggers a full AMASAMYA audit on that tab. The audit runs inside the browser extension; findings are returned to NVDA; NVDA speaks the summary and offers to walk the findings one by one with arrow keys inside an on-screen list.
- No need to open or focus the AMASAMYA side panel at all. The audit result goes straight to the screen reader.

Technical risks:
- Firefox and Chromium have slightly different native-host JSON schemas. The installTasks.py needs to detect which browsers are installed on the host machine and register once per browser, with a fallback if the user installs a new browser later.
- NVDA runs as a Windows service in some configurations; a native host launched by Chrome from the service context may not have the environment the Python script expects. We will need to test this with NVDA's secure-desktop mode and against sign-in-screen scenarios.

## Distribution

Phase 1: hand-zipped .nvda-addon file published alongside the AMASAMYA browser-extension dist/ directory. Sideload-only.

Phase 2 ships: submit to the NVDA Community Add-ons Store at addons.nvda-project.org. Submission is a GitHub PR against the add-ons repository; review process typically takes one to three weeks.

Phase 3 ships: coordinate the add-on store submission with a browser-extension patch that adds the nativeMessaging permission. Timing matters: the extensions should be live with the new permission before the add-on asks users to use it.

## Blind-first design rules this add-on must honour

Per memory/feedback-blind-first-product.md, AMASAMYA is blind-first as a product-design principle, not just a positioning phrase. These three rules apply to every phase of this add-on and are baked in; they are not optional choices to pick between.

1. Braille is a peer output channel. Every announcement in every phase uses NVDA's `ui.message()` so NVDA fans the text out to both speech and the user's Braille display in the same call. Messages are kept short enough to be legible on a 40-cell Braille display (the common size); longer explanations go in `ui.browseableMessage()` which the user can read character-by-character in Braille at their own pace. No speech-only output.

2. Keyboard-only input. Every script is bound to a keyboard gesture. No mouse, no hover, no visual pointer required for any feature. Gestures do not conflict with the common NVDA, JAWS, or Dolphin shortcut set.

3. Settings UI is the standard NVDA settings-panel pattern when the add-on reaches the point of needing one. NVDA's settings panel is navigable by blind users by construction. The "edit a config file" shortcut is a sighted-first fallback and is not available here.

## Open questions, flag before writing code for Phase 3

The only remaining Phase 3 design question that affects scope:

Should the native-messaging bridge offer the browser-to-NVDA direction only (NVDA receives audit results from the extension), or both directions (NVDA also sends commands to the extension: focus the panel, run a crawl, export a report)? Bidirectional roughly doubles the Phase 3 implementation cost. For a blind-first product the bidirectional case is more compelling than it would be otherwise, because NVDA shortcuts replace mouse-driven UI steps the blind user would otherwise have to navigate the browser side panel to execute. Decide before Phase 3 begins; list three concrete commands you would use regularly if the answer is "both".
</parameter>
</invoke>