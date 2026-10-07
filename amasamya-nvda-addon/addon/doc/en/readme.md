AMASAMYA Accessibility Audit Companion for NVDA

This add-on works alongside the AMASAMYA browser add-ons for Chrome, Microsoft Edge, and Firefox. It gives you NVDA shortcuts that make the audit panel easier to reach and read.

AMASAMYA itself is a free accessibility checker that finds problems on web pages that stop blind and low-vision people from using them. If you have not installed the browser add-on yet, get it from https://amasamya.com before you install this NVDA add-on.

What this version does

This is version 0.1.0, the first release. It ships one script.

Press NVDA plus Shift plus A anywhere in Chrome, Edge, or Firefox. The add-on checks whether the AMASAMYA audit panel is open on the current browser tab and tells you.

If the panel is open, NVDA says "AMASAMYA panel is open on PAGE_TITLE" and reminds you how to move your keyboard focus into the panel.

If the panel is not visible, NVDA says "AMASAMYA panel is not visible" and reminds you to press Alt plus Shift plus 1 to open it.

If a browser is not in the foreground, NVDA tells you to switch to Chrome, Edge, or Firefox first.

What is coming later

Version 0.2 will add scripts to jump between findings in the AMASAMYA panel and to read the current finding's fix out loud without having to navigate the results table.

Version 0.3 will add a direct bridge between NVDA and the AMASAMYA audit engine, so you can press one keyboard shortcut and hear the audit results spoken by NVDA without having to open or focus the panel at all.

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