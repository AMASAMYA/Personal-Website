AMASAMYA Accessibility Audit Companion for NVDA

This add-on works alongside the AMASAMYA browser add-ons for Chrome, Microsoft Edge, and Firefox. It gives you NVDA shortcuts that make the audit panel easier to reach and read.

AMASAMYA itself is a free accessibility checker that finds problems on web pages that stop blind and low-vision people from using them. If you have not installed the browser add-on yet, get it from https://amasamya.com before you install this NVDA add-on.

What this version does

This is version 0.2.0. It ships five keyboard shortcuts, all under the "AMASAMYA" category in NVDA's Input Gestures dialog, so you can rebind any of them if they clash with your own setup. Everything you hear through this add-on also goes to your Braille display at the same time.

NVDA plus Shift plus A: Where is the AMASAMYA panel? Checks whether the audit panel is open on the current browser tab. If yes, tells you the page title and reminds you to press F6 to move focus into the panel. If no, reminds you how to open it.

NVDA plus Shift plus N: Jump to the next failure in the panel's findings table. Finds the next row whose severity is Critical or Serious, moves the NVDA navigator to it (does not steal your keyboard focus), and speaks the row briefly along with "N of M failures" so you know where you are in the list.

NVDA plus Shift plus P: Jump to the previous failure. Same as above but walks backwards.

NVDA plus Shift plus F: Read the current finding's fix. Looks at whichever row the NVDA navigator is on and reads out the How-to-Fix text. If you have not jumped to a finding yet, it tells you to press NVDA plus Shift plus N first.

NVDA plus Shift plus U: Speak the audit summary. Reads the four severity counts (failures, warnings, passes, info) in one short sentence that fits a 40-cell Braille display.

If a browser is not in the foreground, every one of the five scripts tells you to switch to Chrome, Edge, or Firefox and press again.

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