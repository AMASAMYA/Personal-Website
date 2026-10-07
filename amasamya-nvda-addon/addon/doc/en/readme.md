AMASAMYA Accessibility Audit Companion for NVDA

This add-on works alongside the AMASAMYA browser add-ons for Chrome, Microsoft Edge, and Firefox. It gives you NVDA shortcuts that make the audit panel easier to reach and read.

AMASAMYA itself is a free accessibility checker that finds problems on web pages that stop blind and low-vision people from using them. If you have not installed the browser add-on yet, get it from https://amasamya.com before you install this NVDA add-on.

What this version does

This is version 0.2.1. Five commands, each reachable two ways. Use whichever feels better. Both reach the same scripts, so there is nothing to re-learn when you switch.

All output goes to speech and Braille at the same time, so if you use a Braille display you get the same information without a separate shortcut.

The five commands are:

A: Where is the AMASAMYA panel? Checks whether the audit panel is open on the current browser tab. If yes, tells you the page title and reminds you to press F6 to move focus into the panel. If no, reminds you how to open it.

N: Jump to the next failure in the panel's findings table. Finds the next row whose severity is Critical or Serious, moves the NVDA navigator to it (does not steal your keyboard focus), and speaks the row briefly along with "N of M failures" so you know where you are in the list.

P: Jump to the previous failure. Same as above but walks backwards.

F: Read the current finding's fix. Looks at whichever row the NVDA navigator is on and reads out the How-to-Fix text. If you have not jumped to a finding yet, it tells you to go to a failure first.

U: Speak the audit summary. Reads the four severity counts (failures, warnings, passes, info) in one short sentence that fits a 40-cell Braille display.

Two ways to run them

The single-stroke way: hold NVDA plus Alt, then press the letter. So NVDA plus Alt plus A, NVDA plus Alt plus N, and so on. Fastest if you do not already have NVDA plus Alt bindings for other add-ons.

The layer way: press NVDA plus A once. NVDA says "AMASAMYA layer. A panel, N next, P previous, F fix, U summary." Within two seconds, press one letter (A, N, P, F, or U) to run that command. The layer closes on its own after two seconds, or immediately once you press a letter, or if you press any other key to cancel. Press NVDA plus A again inside the two seconds to close the layer early. Zero conflicts guaranteed because the single letters A/N/P/F/U only mean anything while the layer is open.

Both paths work at the same time. Pick whichever you want, or use both depending on what you are doing.

If a browser is not in the foreground, every command tells you to switch to Chrome, Edge, or Firefox and press again.

If any shortcut conflicts with your setup, open NVDA menu, Preferences, Input Gestures, find the "AMASAMYA" category, and rebind. The layer entry (NVDA plus A) can be rebound too.

What is coming later

Version 0.3 will add a direct bridge between NVDA and the AMASAMYA audit engine, so you can press one keyboard shortcut and hear the audit results spoken by NVDA without having to open or focus the panel at all. The bridge will also go the other way: NVDA shortcuts to tell the browser extension to focus the panel, run a crawl, or export a report.

Install

Open the .nvda-addon file. NVDA shows a confirmation dialog. Press Yes to install. NVDA will offer to restart; press Yes to apply the add-on.

Uninstall

Open NVDA menu, choose Tools, choose Manage add-ons, find AMASAMYA Accessibility Audit Companion in the list, press the Remove button. Restart NVDA.

Who made this

Akhilesh Malani, a blind accessibility engineer in Chennai, India. Akhilesh has used a screen reader every day for over 16 years. He built AMASAMYA and this companion add-on in his personal time because he could not find accessibility tools a blind engineer could use without asking a sighted colleague for help. The add-on is free and always will be.

Links

AMASAMYA home: https://amasamya.com
Audit platform: https://platform.amasamya.com
Chrome Web Store: https://chromewebstore.google.com/detail/blnfmiipkccpggpinjofhhglfcgglbif
Microsoft Edge Add-ons: https://microsoftedge.microsoft.com/addons/detail/amasamya-accessibility-/enpnjjkakecacidhckphimkmhobjcblj
Firefox Add-ons: https://addons.mozilla.org/en-US/firefox/addon/amasamya-accessibility-audit/
Source code: https://github.com/AMASAMYA/AMASAMYA
</parameter>
</invoke>