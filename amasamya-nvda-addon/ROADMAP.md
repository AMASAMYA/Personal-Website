# AMASAMYA NVDA Add-on Roadmap

Last reviewed: 2026-10-07 (v0.1.0 scaffold shipped; sideload-ready. Not yet submitted to the NVDA Community Add-ons Store; submission waits for Phase 2 feature set).

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

## v0.2 - Panel navigation scripts (planned, not scoped)

Depends on UIA-tree navigation of the AMASAMYA side panel on each supported browser. Chrome and Edge expose essentially the same tree (both Chromium); Firefox's XUL-based sidebar hosts a document in its own context and the tree walk needs a different root. Expect per-browser code paths.

Scripts planned:
- Jump to next failure (NVDA+Shift+F): finds the next Fail-severity row in the panel's results table and moves focus to it, then speaks the finding's element + issue.
- Jump to previous failure (NVDA+Shift+Shift+F or an equivalent): the reverse.
- Read current finding's fix (NVDA+Shift+H): reads the How to Fix cell of whichever finding row is currently focused, in NVDA's own voice with cleaner phrasing than the panel's polite-region announcement.
- Speak audit summary (NVDA+Shift+S): one short utterance with the four severity counts plus a per-engine breakdown.

Technical risks:
- The AMASAMYA panel renders its findings table via Shadow DOM in some code paths; UIA may or may not surface Shadow DOM depending on browser version and NVDA version. May need a message-based fallback where the panel exposes a lightweight data attribute the add-on can read.
- Firefox's sidebar panel does not propagate focus events in the same way as Chrome's side panel. The Phase 2 scripts will need to fall back to object-navigation rather than depending on focus events alone.

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

## Open questions, flag before writing code for the next phase

1. Does Akhilesh want a Braille-first alternative to the "speak" output in Phase 2? NVDA supports Braille displays natively; routing summaries to Braille instead of (or alongside) speech is a one-line change per script but affects the UX design.
2. Does Phase 3 require a settings panel inside the add-on for selecting default-browser, verbosity, and alert thresholds? If yes, that is additional scope.
3. Should the Phase 3 native-messaging bridge also offer the same features in reverse: NVDA sending commands to the browser extension (focus the panel, run a crawl, export a report)? That is a bidirectional bridge and would roughly double the Phase 3 implementation cost.
</parameter>
</invoke>