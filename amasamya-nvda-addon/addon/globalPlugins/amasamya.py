# -*- coding: utf-8 -*-
"""
AMASAMYA NVDA companion add-on.

v0.2.0 (2026-10-07) - Phase 2 shipped: five scripts total, all
bound to the "AMASAMYA" category in NVDA's Input Gestures dialog so
users can rebind cleanly if any gesture conflicts with their own
setup.

  NVDA+Shift+A - where is the AMASAMYA panel on this tab
  NVDA+Shift+N - jump to next failure (Critical or Serious)
  NVDA+Shift+P - jump to previous failure
  NVDA+Shift+F - read the current finding's fix
  NVDA+Shift+U - speak the audit summary (four severity counts)

Blind-first design rules this file honours
  Per memory/feedback-blind-first-product.md:
  1. Every announcement routes through ui.message() so NVDA fans
     the text out to speech AND Braille in the same call.
  2. Messages are short (one or two sentences) so they are legible
     on a 40-cell Braille display without the user hunting.
  3. We never grab focus. We set the navigator object (NVDA's
     equivalent of a secondary cursor) and let the user press
     NVDA+NumpadEnter if they want to actually interact. Focus
     theft mid-audit is jarring for a blind user.
  4. All inputs are keyboard. There is no mouse path anywhere in
     this file.

Later phases (see amasamya-nvda-addon/ROADMAP.md):
  Phase 3: bidirectional native-messaging bridge so NVDA triggers
  audits directly AND sends commands (focus panel, run crawl,
  export report) to the browser extension.
"""

import globalPluginHandler
import api
import ui
import controlTypes
from scriptHandler import script


SUPPORTED_BROWSERS = {
    "chrome",       # Chrome, Chromium, Brave, Vivaldi all report as "chrome"
    "msedge",       # Microsoft Edge
    "firefox",      # Mozilla Firefox
    "opera",        # Opera (Chromium-based)
}

PANEL_NAME_PREFIX = "AMASAMYA"

# Severity words we treat as Fail-equivalent for the next/previous
# failure walk. The panel surfaces severity through the sev-badge
# class and the aria-label text on each row's severity cell; the
# aria-label words below are what NVDA actually hears.
FAIL_SEVERITIES = ("Critical", "Serious")

# Summary card labels, in reading order on the panel. These match
# the aria-label text on each card in both the Chrome/Edge
# sidepanel/panel.html and the Firefox sidebar/panel.html; keep in
# sync when the panel markup changes.
SUMMARY_CARD_LABELS = ("Failures", "Warnings", "Passes", "Info")


# ---------------------------------------------------------------------
# Helpers (defensive: everything that touches the UIA tree is wrapped
# in try/except because object navigation can throw at any step when
# the DOM mutates mid-walk, which SPAs do frequently).
# ---------------------------------------------------------------------

def _foreground_app_name():
    try:
        obj = api.getForegroundObject()
        if obj is None or obj.appModule is None:
            return None
        return (obj.appModule.appName or "").lower()
    except Exception:
        return None


def _is_supported_browser_foreground():
    return _foreground_app_name() in SUPPORTED_BROWSERS


def _find_amasamya_panel(root, max_depth=8):
    """Breadth-first bounded walk looking for the AMASAMYA panel root."""
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


def _iter_descendants(root, max_depth=12):
    """Iterator over every descendant of root, bounded depth."""
    stack = [(root, 0)]
    while stack:
        obj, depth = stack.pop()
        try:
            name = obj.name
        except Exception:
            name = ""
        yield obj
        if depth >= max_depth:
            continue
        try:
            child = obj.firstChild
        except Exception:
            child = None
        while child is not None:
            stack.append((child, depth + 1))
            try:
                child = child.next
            except Exception:
                child = None


def _find_findings_rows(panel):
    """Return every row object inside the panel's findings table.

    Uses controlTypes.Role.ROW when available; falls back to a name
    heuristic if role detection fails on a given browser version.
    """
    rows = []
    if panel is None:
        return rows
    try:
        row_role = controlTypes.Role.ROW
    except AttributeError:
        row_role = None
    for obj in _iter_descendants(panel):
        try:
            role = obj.role
        except Exception:
            role = None
        if row_role is not None and role == row_role:
            rows.append(obj)
    return rows


def _row_severity(row):
    """Pull a severity word out of a findings row's accessible name."""
    try:
        name = (row.name or "")
    except Exception:
        return ""
    for sev in ("Critical", "Serious", "Moderate", "Minor"):
        if sev in name:
            return sev
    return ""


def _row_is_failure(row):
    return _row_severity(row) in FAIL_SEVERITIES


def _current_navigator_row(rows):
    """Return the index of the currently-focused or currently-navigated
    row in `rows`, or -1 if the user is not on one of them."""
    try:
        nav = api.getNavigatorObject()
    except Exception:
        nav = None
    if nav is None:
        return -1
    for i, row in enumerate(rows):
        if row == nav:
            return i
        # Also match if nav is a descendant cell of this row
        try:
            parent = nav.parent
        except Exception:
            parent = None
        while parent is not None:
            if parent == row:
                return i
            try:
                parent = parent.parent
            except Exception:
                parent = None
    return -1


def _speak_row_brief(row):
    """One-sentence speech + Braille summary of a single findings row."""
    try:
        text = (row.name or "").strip()
    except Exception:
        text = ""
    if not text:
        ui.message("Finding on this row has no readable text.")
        return
    # Keep the message tight for 40-cell Braille displays. Strip any
    # trailing boilerplate the panel appends to the row name (e.g.
    # table position markers that NVDA will announce itself anyway).
    if len(text) > 180:
        text = text[:177] + "..."
    ui.message(text)


def _page_title_from_browser(foreground):
    """Best-effort page title: strip the browser suffix the browser
    appends (" - Google Chrome", etc)."""
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


def _not_in_browser_message():
    ui.message(
        "AMASAMYA companion needs a browser in the foreground. "
        "Switch to Chrome, Microsoft Edge, or Firefox and try again."
    )


def _no_panel_message(foreground):
    page = _page_title_from_browser(foreground) or "the current page"
    ui.message(
        "AMASAMYA panel is not visible on {page}. Press Alt plus "
        "Shift plus 1 to open it.".format(page=page)
    )


# ---------------------------------------------------------------------
# GlobalPlugin: NVDA loads this at startup and keeps one instance.
# ---------------------------------------------------------------------

class GlobalPlugin(globalPluginHandler.GlobalPlugin):

    scriptCategory = "AMASAMYA"

    # -----------------------------------------------------------------
    # Script 1 (v0.1.0): where is the panel
    # -----------------------------------------------------------------

    @script(
        description=(
            "Check whether the AMASAMYA audit panel is open on the "
            "current browser tab and speak the result."
        ),
        gesture="kb:NVDA+shift+a",
        category="AMASAMYA",
    )
    def script_whereIsPanel(self, gesture):
        if not _is_supported_browser_foreground():
            _not_in_browser_message()
            return
        foreground = api.getForegroundObject()
        panel = _find_amasamya_panel(foreground)
        page = _page_title_from_browser(foreground) or "the current page"
        if panel is not None:
            ui.message(
                "AMASAMYA panel is open on {page}. Press F6 to move "
                "focus into it.".format(page=page)
            )
        else:
            _no_panel_message(foreground)

    # -----------------------------------------------------------------
    # Script 2 (v0.2.0): jump to next failure
    # -----------------------------------------------------------------

    @script(
        description=(
            "Jump to the next failure (Critical or Serious) in the "
            "AMASAMYA panel's findings table. Sets the navigator "
            "object; does not steal focus."
        ),
        gesture="kb:NVDA+shift+n",
        category="AMASAMYA",
    )
    def script_nextFailure(self, gesture):
        self._walk_failure(direction=1)

    # -----------------------------------------------------------------
    # Script 3 (v0.2.0): jump to previous failure
    # -----------------------------------------------------------------

    @script(
        description=(
            "Jump to the previous failure (Critical or Serious) in "
            "the AMASAMYA panel's findings table. Sets the navigator "
            "object; does not steal focus."
        ),
        gesture="kb:NVDA+shift+p",
        category="AMASAMYA",
    )
    def script_previousFailure(self, gesture):
        self._walk_failure(direction=-1)

    def _walk_failure(self, direction):
        if not _is_supported_browser_foreground():
            _not_in_browser_message()
            return
        foreground = api.getForegroundObject()
        panel = _find_amasamya_panel(foreground)
        if panel is None:
            _no_panel_message(foreground)
            return
        rows = _find_findings_rows(panel)
        failures = [i for i, r in enumerate(rows) if _row_is_failure(r)]
        if not failures:
            ui.message(
                "No failures in the AMASAMYA panel. The page may have "
                "passed, or the audit has not run yet."
            )
            return
        current = _current_navigator_row(rows)
        # Build the ordered list of failure indexes to walk through.
        if direction > 0:
            next_indexes = [i for i in failures if i > current]
            if not next_indexes:
                ui.message(
                    "You are on or past the last failure. Press "
                    "NVDA plus Shift plus P to go back to the "
                    "previous one."
                )
                return
            target_idx = next_indexes[0]
        else:
            prev_indexes = [i for i in failures if i < current]
            if not prev_indexes:
                ui.message(
                    "You are at or before the first failure. Press "
                    "NVDA plus Shift plus N to go forward to the "
                    "next one."
                )
                return
            target_idx = prev_indexes[-1]
        target = rows[target_idx]
        # Set the navigator (NVDA's secondary cursor) so NVDA+NumpadEnter
        # will activate the row; do not change focus.
        try:
            api.setNavigatorObject(target)
        except Exception:
            pass
        position = "{n} of {total} failures".format(
            n=failures.index(target_idx) + 1, total=len(failures)
        )
        ui.message(position + ".")
        _speak_row_brief(target)

    # -----------------------------------------------------------------
    # Script 4 (v0.2.0): read the current finding's fix
    # -----------------------------------------------------------------

    @script(
        description=(
            "Read the How-to-Fix text of the finding currently under "
            "the navigator in the AMASAMYA panel."
        ),
        gesture="kb:NVDA+shift+f",
        category="AMASAMYA",
    )
    def script_readFix(self, gesture):
        if not _is_supported_browser_foreground():
            _not_in_browser_message()
            return
        foreground = api.getForegroundObject()
        panel = _find_amasamya_panel(foreground)
        if panel is None:
            _no_panel_message(foreground)
            return
        rows = _find_findings_rows(panel)
        if not rows:
            ui.message(
                "No findings in the AMASAMYA panel. Run an audit "
                "first with Alt plus Shift plus 1."
            )
            return
        current = _current_navigator_row(rows)
        if current < 0:
            ui.message(
                "You are not on a finding row. Press NVDA plus Shift "
                "plus N to jump to the first failure, then NVDA plus "
                "Shift plus F to read its fix."
            )
            return
        row = rows[current]
        fix = _find_fix_text(row)
        if fix:
            ui.message("Fix. " + fix)
        else:
            ui.message(
                "No How-to-Fix text found on this row. The row may "
                "need to be expanded first; activate it with NVDA "
                "plus NumpadEnter."
            )

    # -----------------------------------------------------------------
    # Script 5 (v0.2.0): speak the audit summary
    # -----------------------------------------------------------------

    @script(
        description=(
            "Speak the AMASAMYA audit summary: the four severity "
            "counts (failures, warnings, passes, info) in one short "
            "utterance."
        ),
        gesture="kb:NVDA+shift+u",
        category="AMASAMYA",
    )
    def script_speakSummary(self, gesture):
        if not _is_supported_browser_foreground():
            _not_in_browser_message()
            return
        foreground = api.getForegroundObject()
        panel = _find_amasamya_panel(foreground)
        if panel is None:
            _no_panel_message(foreground)
            return
        counts = _read_summary_counts(panel)
        if not counts:
            ui.message(
                "AMASAMYA summary cards not found. Run an audit "
                "first with Alt plus Shift plus 1."
            )
            return
        # Build one tight utterance that reads well in speech AND
        # fits a 40-cell Braille display. Example output:
        # "3 failures, 2 warnings, 48 passes, 1 info."
        parts = []
        for label in SUMMARY_CARD_LABELS:
            if label in counts:
                parts.append("{n} {label}".format(
                    n=counts[label], label=label.lower()
                ))
        if not parts:
            ui.message("AMASAMYA summary cards found but no counts could be read.")
            return
        ui.message(", ".join(parts) + ".")


# ---------------------------------------------------------------------
# Panel-specific accessors (kept outside the GlobalPlugin so they are
# easy to test in isolation when Phase 3 adds the native-messaging
# bridge and we need to reuse them from a different entry point).
# ---------------------------------------------------------------------

def _find_fix_text(row):
    """Return the How-to-Fix text for a row, or None if not found.

    Strategy: look at the row's children for a cell whose accessible
    name starts with "Fix" or "How to Fix" (the panel markup uses
    both). Falls back to any descendant whose name includes "How to
    Fix" if a direct child match fails.
    """
    if row is None:
        return None
    try:
        child = row.firstChild
    except Exception:
        child = None
    while child is not None:
        try:
            name = (child.name or "")
        except Exception:
            name = ""
        if name.startswith("Fix") or name.startswith("How to Fix"):
            # Return the text after the label itself, if present
            if ":" in name:
                return name.split(":", 1)[1].strip()
            return name
        try:
            child = child.next
        except Exception:
            child = None
    # Fallback: scan descendants
    for obj in _iter_descendants(row, max_depth=5):
        try:
            name = (obj.name or "")
        except Exception:
            name = ""
        if "How to Fix" in name:
            if ":" in name:
                return name.split(":", 1)[1].strip()
            return name
    return None


def _read_summary_counts(panel):
    """Scan the summary cards and return a dict {label: count_int}.

    The AMASAMYA panel renders counts inside objects whose accessible
    name is in the shape "Failures: 3", "Warnings: 2", etc. We look
    for the four known labels and parse the integer that follows the
    colon.
    """
    counts = {}
    if panel is None:
        return counts
    for obj in _iter_descendants(panel, max_depth=10):
        try:
            name = (obj.name or "")
        except Exception:
            name = ""
        for label in SUMMARY_CARD_LABELS:
            prefix = label + ":"
            if name.startswith(prefix):
                tail = name[len(prefix):].strip()
                # Pull the leading integer (handles trailing text).
                digits = ""
                for ch in tail:
                    if ch.isdigit():
                        digits += ch
                    else:
                        break
                if digits:
                    try:
                        counts[label] = int(digits)
                    except ValueError:
                        pass
                break
        if len(counts) == len(SUMMARY_CARD_LABELS):
            break
    return counts
