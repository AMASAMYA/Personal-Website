# AMASAMYA Accessibility Audit Companion for NVDA

This add-on works alongside the AMASAMYA browser extensions for Chrome, Microsoft Edge, and Firefox. It provides keyboard-driven NVDA shortcuts that make the accessibility audit panel easy to reach, inspect, and navigate.

AMASAMYA is a free accessibility suite designed to uncover accessibility barriers on web pages that prevent blind and low-vision screen reader users from using them. If you have not installed the browser extension yet, install it from https://amasamya.com before using this NVDA add-on.

## What this version does

This is version 0.2.12. Six commands, each reachable two ways. Use whichever feels better. Both reach the same scripts, so there is nothing to re-learn when you switch.

All output routes to speech and Braille simultaneously through `ui.message()`, ensuring Braille displays receive full position cues and finding details without truncation or overwrite.

The six commands are:

- **A: Where is the AMASAMYA panel?**
  Checks whether the audit panel is open on the current browser tab and whether your focus is currently inside the panel. If focus is inside the panel, announces your focused control (for example, the WCAG Audit tab or a finding row). If the panel is open but focus is on the web page, reminds you to press F6 to move focus into the panel. If not visible, provides instructions on how to open it (Alt plus Shift plus 1).

- **N: Jump to next failure**
  Finds the next row in the panel's findings table whose severity is Critical or Serious, moves the NVDA navigator object to it (without stealing keyboard focus), and speaks "N of M failures" along with the finding summary.

- **P: Jump to previous failure**
  Same as above, walking backwards through the failure rows.

- **F: Read current finding fix**
  Reads the How-to-Fix remediation guidance for the finding currently under the NVDA navigator. If the row is collapsed, it automatically triggers the row disclosure so you hear the fix immediately. If no finding row is selected, it intelligently focuses the first failure.

- **U: Speak audit summary**
  Reads the four severity counts (failures, warnings, passes, info) in one short sentence formatted to fit cleanly on a 40-cell Braille display.

- **D: Diagnostic report**
  Walks the accessible desktop tree and dumps browser object details to `%USERPROFILE%\Downloads\amasamya-nvda-diag.txt` to verify tree resolution.

## Two ways to run commands

1. **Single-stroke Alt-modifier shortcuts (fastest):**
   - NVDA + Alt + A : Check panel presence
   - NVDA + Alt + N : Jump to next failure
   - NVDA + Alt + P : Jump to previous failure
   - NVDA + Alt + F : Read How-to-Fix text
   - NVDA + Alt + U : Speak audit summary
   - NVDA + Alt + D : Generate diagnostic report

2. **Layer command mode (zero-conflict guarantee):**
   - Press **NVDA + A** once to enter the AMASAMYA layer.
   - NVDA announces: "AMASAMYA layer. A panel, N next, P previous, F fix, U summary."
   - Within two seconds, press one letter (**A**, **N**, **P**, **F**, **U**, or **D**) to execute the matching command.
   - The layer automatically exits after two seconds, immediately upon pressing a command key, or if Escape is pressed. Pressing NVDA + A a second time cancels immediately.

Both input methods are active simultaneously. All shortcuts can be customized in NVDA via Menu -> Preferences -> Input Gestures under the "AMASAMYA" category.

## Installation

Open the `.nvda-addon` file directly or open NVDA -> Tools -> Add-on Store -> Installed Add-ons -> Install from external file. Confirm the installation prompt and restart NVDA.

## Uninstallation

Open NVDA -> Tools -> Add-on Store -> Installed Add-ons, select "AMASAMYA Accessibility Audit Companion", and select Remove. Restart NVDA.

## Author

Akhilesh Malani, blind accessibility engineer in Chennai, India. Built to provide blind testers and developers with equal, independent access to accessibility auditing tools.

## Links

- AMASAMYA Portal: https://amasamya.com
- Chrome Web Store: https://chromewebstore.google.com/detail/blnfmiipkccpggpinjofhhglfcgglbif
- Microsoft Edge Add-ons: https://microsoftedge.microsoft.com/addons/detail/amasamya-accessibility-/enpnjjkakecacidhckphimkmhobjcblj
- Firefox Add-ons: https://addons.mozilla.org/en-US/firefox/addon/amasamya-accessibility-audit/
- Source Repository: https://github.com/AMASAMYA/AMASAMYA