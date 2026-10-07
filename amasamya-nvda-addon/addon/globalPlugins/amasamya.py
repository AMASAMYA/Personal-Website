# -*- coding: utf-8 -*-
"""
AMASAMYA NVDA companion add-on.

Phase 1 (v0.1.0, 2026-10-07): single script bound to NVDA+Shift+A
that tells the user whether the AMASAMYA audit panel is currently
visible in their browser.

The panel ships inside the AMASAMYA browser extensions (Chrome,
Edge, Firefox) as a side panel / sidebar whose window carries the
accessible name "AMASAMYA Audit Results". NVDA exposes browser UI
through the UIA tree; we walk from the foreground window and look
for any descendant whose name begins with "AMASAMYA".

Later phases (see amasamya-nvda-addon/ROADMAP.md):
  Phase 2: scripts that navigate the panel's results table.
  Phase 3: native-messaging bridge so NVDA triggers audits directly.

See CLAUDE.md and memory/project-nvda-addon.md for the full plan.
"""

import globalPluginHandler
import api
import ui
from scriptHandler import script


SUPPORTED_BROWSERS = {
    "chrome",      # Chrome, Chromium, Brave, Vivaldi all report as "chrome"
    "msedge",      # Microsoft Edge
    "firefox",     # Mozilla Firefox
    "opera",       # Opera (Chromium-based) also uses the Chrome extension
}

PANEL_NAME_PREFIX = "AMASAMYA"


def _foreground_app_name():
    """Return the lowercase appName of the foreground window, or None."""
    try:
        obj = api.getForegroundObject()
        if obj is None or obj.appModule is None:
            return None
        return (obj.appModule.appName or "").lower()
    except Exception:
        return None


def _find_amasamya_panel(root, max_depth=8):
    """Breadth-first walk of the UIA tree looking for the AMASAMYA panel.

    Bounded depth keeps the search cheap; the browser's accessible
    tree is deep but the side-panel landmark sits within the first
    few levels of the browser's main window.
    """
    if root is None:
        return None
    queue = [(root, 0)]
    while queue:
        obj, depth = queue.pop(0)
        try:
            name = (obj.name or "")
        except Exception:
            name = ""
        if name.startswith(PANEL_NAME_PREFIX):
            return obj
        if depth >= max_depth:
            continue
        try:
            child = obj.firstChild
        except Exception:
            child = None
        while child is not None:
            queue.append((child, depth + 1))
            try:
                child = child.next
            except Exception:
                child = None
    return None


def _page_title_from_browser(foreground):
    """Best-effort page title: use the foreground window name and strip
    the browser suffix the browser appends (" - Google Chrome", etc)."""
    try:
        title = (foreground.name or "").strip()
    except Exception:
        return ""
    for suffix in (
        " - Google Chrome",
        " - Microsoft Edge",
        " - Mozilla Firefox",
        " - Brave",
        " - Opera",
    ):
        if title.endswith(suffix):
            return title[: -len(suffix)].strip()
    return title


class GlobalPlugin(globalPluginHandler.GlobalPlugin):
    """Entry point NVDA loads at startup."""

    scriptCategory = "AMASAMYA"

    @script(
        description=(
            "Check whether the AMASAMYA audit panel is open on the "
            "current browser tab and speak the result."
        ),
        gesture="kb:NVDA+shift+a",
        category="AMASAMYA",
    )
    def script_whereIsPanel(self, gesture):
        app = _foreground_app_name()
        if app not in SUPPORTED_BROWSERS:
            ui.message(
                "AMASAMYA companion needs a browser in the foreground. "
                "Switch to Chrome, Microsoft Edge, or Firefox and press "
                "NVDA plus Shift plus A again."
            )
            return
        foreground = api.getForegroundObject()
        panel = _find_amasamya_panel(foreground)
        page = _page_title_from_browser(foreground) or "the current page"
        if panel is not None:
            ui.message(
                "AMASAMYA panel is open on {page}. Switch to the panel "
                "with F6 or your browser's panel-focus command to read "
                "the findings.".format(page=page)
            )
        else:
            ui.message(
                "AMASAMYA panel is not visible on {page}. Press Alt "
                "plus Shift plus 1 to open it, then press NVDA plus "
                "Shift plus A again to confirm.".format(page=page)
            )
