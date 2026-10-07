# -*- coding: utf-8 -*-
"""
AMASAMYA NVDA companion add-on.

v0.2.1 (2026-10-07) - Dual-binding Phase 2 ships: every AMASAMYA
script is reachable through TWO keyboard paths simultaneously.
Users pick whichever one feels better; no one has to memorise
anything they do not want.

PATH 1: single-stroke Alt-modifier shortcuts (fastest)
  NVDA+Alt+A - where is the AMASAMYA panel on this tab
  NVDA+Alt+N - jump to next failure (Critical or Serious)
  NVDA+Alt+P - jump to previous failure
  NVDA+Alt+F - read the current finding's fix
  NVDA+Alt+U - speak the audit summary (four severity counts)

PATH 2: layer command (zero-conflict guarantee, two keystrokes)
  NVDA+A opens the AMASAMYA layer. Within two seconds, press
  one of: A for panel location, N for next failure, P for
  previous failure, F for fix, U for summary. The layer closes
  automatically after two seconds, or immediately when any
  letter key fires, or when Escape or any other key cancels it.

Both paths run the same five underlying scripts. Rebind any of
them through NVDA's Input Gestures dialog under the "AMASAMYA"
category if any shortcut conflicts with your setup; both the
Alt-modifier default and the layer trigger can be re-bound.

Blind-first design rules this file honours
  Per memory/feedback-blind-first-product.md:
  1. Every announcement routes through ui.message() so NVDA fans
     the text out to speech AND Braille in the same call.
  2. Messages are short (one or two sentences) so they are legible
     on a 40-cell Braille display without hunting.
  3. We never grab focus. We set the navigator object (NVDA's
     secondary cursor) and let the user press NVDA+NumpadEnter if
     they want to actually interact. Focus theft mid-audit is
     jarring for a blind user.
  4. All inputs are keyboard. There is no mouse path anywhere in
     this file.
  5. The layer prompt names all five letters so a first-time user
     who presses NVDA+A can hear what their options are without
     having to look up documentation.
"""

import threading

import globalPluginHandler
import api
import ui
import controlTypes
from scriptHandler import script

try:
    from keyboardHandler import KeyboardInputGesture
except Exception:  # NVDA versions / builds where the module path differs
    KeyboardInputGesture = None


SUPPORTED_BROWSERS = {
    "chrome",       # Chrome, Chromium, Brave, Vivaldi all report as "chrome"
    "msedge",       # Microsoft Edge
    "firefox",      # Mozilla Firefox
    "opera",        # Opera (Chromium-based)
}

PANEL_NAME_PREFIX = "AMASAMYA"

FAIL_SEVERITIES = ("Critical", "Serious")

SUMMARY_CARD_LABELS = ("Failures", "Warnings", "Passes", "Info")

# Layer command: letter -> name of the script method on GlobalPlugin
# (minus the "script_" prefix). Kept as a class-level constant so a
# user rebinding the layer entry to a different gesture can reach the
# same five scripts through the same mnemonic.
LAYER_MAP = {
    "a": "whereIsPanel",
    "n": "nextFailure",
    "p": "previousFailure",
    "f": "readFix",
    "u": "speakSummary",
}

# How long the layer stays armed after NVDA+A, in seconds. Two
# seconds is enough for an unhurried second keystroke and short
# enough that an accidental NVDA+A does not sit open indefinitely.
LAYER_TIMEOUT_SECONDS = 2.0


# ---------------------------------------------------------------------
# UIA helpers (defensive: everything that touches the tree is wrapped
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


def _browser_window_root(obj):
    """Walk up the a11y tree to the browser's top-level window.

    api.getForegroundObject() typically returns the focused web
    content (the active tab's document), which is a descendant of
    the browser frame. The AMASAMYA side panel in Chrome, Edge, and
    Firefox lives alongside that content frame, not inside it, so a
    descend-only search from the foreground will never find it. This
    helper walks parent -> parent until it reaches the top (parent
    is None) or detects a cycle, giving us a root from which both the
    tab content AND the side panel are reachable.
    """
    if obj is None:
        return None
    cur = obj
    seen = set()
    while cur is not None:
        if id(cur) in seen:
            return cur
        seen.add(id(cur))
        try:
            parent = cur.parent
        except Exception:
            parent = None
        if parent is None:
            return cur
        cur = parent
    return obj


def _find_amasamya_panel(root, max_depth=16):
    """Breadth-first bounded walk looking for the AMASAMYA panel root.

    v0.2.5: max_depth bumped from 8 to 16 because the search now
    starts at the browser top-level window instead of the focused
    content tab, so the panel sits deeper in the tree relative to
    the root we hand in.
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


def _find_amasamya_panel_in_browser(foreground):
    """Find the AMASAMYA panel starting from the browser's root window.

    Combines _browser_window_root and _find_amasamya_panel so every
    @script call site stays a one-liner. Returns None if no panel
    is found anywhere in the browser window.
    """
    return _find_amasamya_panel(_browser_window_root(foreground))


def _iter_descendants(root, max_depth=12):
    """Iterator over every descendant of root, bounded depth."""
    stack = [(root, 0)]
    while stack:
        obj, depth = stack.pop()
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
    """Return every row object inside the panel's findings table."""
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
    """Return the index of the currently-navigated row in `rows`, or -1."""
    try:
        nav = api.getNavigatorObject()
    except Exception:
        nav = None
    if nav is None:
        return -1
    for i, row in enumerate(rows):
        if row == nav:
            return i
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
    if len(text) > 180:
        text = text[:177] + "..."
    ui.message(text)


def _page_title_from_browser(foreground):
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


def _find_fix_text(row):
    """Return the How-to-Fix text for a row, or None if not found."""
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
            if ":" in name:
                return name.split(":", 1)[1].strip()
            return name
        try:
            child = child.next
        except Exception:
            child = None
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
    """Return a dict {label: count_int} parsed from the summary cards."""
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


# ---------------------------------------------------------------------
# GlobalPlugin
# ---------------------------------------------------------------------

class GlobalPlugin(globalPluginHandler.GlobalPlugin):

    scriptCategory = "AMASAMYA"

    def __init__(self):
        super().__init__()
        self._in_layer = False
        self._layer_timer = None

    # -----------------------------------------------------------------
    # Layer-command plumbing
    # -----------------------------------------------------------------

    def getScript(self, gesture):
        """Intercept bare letter presses while the AMASAMYA layer is armed."""
        if self._in_layer:
            if KeyboardInputGesture is not None and isinstance(
                gesture, KeyboardInputGesture
            ):
                # Only accept bare single-letter presses, no modifiers
                try:
                    modifiers = gesture.modifierNames or []
                except Exception:
                    modifiers = []
                try:
                    key_name = (gesture.mainKeyName or "").lower()
                except Exception:
                    key_name = ""
                if not modifiers and key_name in LAYER_MAP:
                    self._exit_layer(silent=True)
                    method_name = "script_" + LAYER_MAP[key_name]
                    script_method = getattr(self, method_name, None)
                    if script_method is not None:
                        return script_method
                # Any other keyboard gesture during layer: cancel and
                # fall through to normal processing.
                self._exit_layer(silent=True)
        return super().getScript(gesture)

    def _enter_layer(self):
        self._cancel_layer_timer()
        self._in_layer = True
        ui.message(
            "AMASAMYA layer. A panel, N next, P previous, F fix, U summary."
        )
        self._layer_timer = threading.Timer(
            LAYER_TIMEOUT_SECONDS, self._on_layer_timeout
        )
        self._layer_timer.daemon = True
        self._layer_timer.start()

    def _exit_layer(self, silent=False):
        was_in = self._in_layer
        self._in_layer = False
        self._cancel_layer_timer()
        if was_in and not silent:
            ui.message("AMASAMYA layer closed.")

    def _on_layer_timeout(self):
        if self._in_layer:
            self._in_layer = False
            # Timed out without a letter: give the user feedback so
            # they do not wonder why their next keystroke went
            # somewhere unexpected.
            ui.message("AMASAMYA layer timed out.")

    def _cancel_layer_timer(self):
        if self._layer_timer is not None:
            try:
                self._layer_timer.cancel()
            except Exception:
                pass
            self._layer_timer = None

    @script(
        description=(
            "Open the AMASAMYA layer. Within two seconds, press A for "
            "panel location, N for next failure, P for previous "
            "failure, F for fix, U for summary. Press any other key "
            "or wait two seconds to cancel."
        ),
        gesture="kb:NVDA+a",
        category="AMASAMYA",
    )
    def script_enterLayer(self, gesture):
        if self._in_layer:
            # NVDA+A pressed while already in the layer: treat as a
            # quick cancel so a user who tapped it twice is not stuck
            # waiting for the timeout.
            self._exit_layer()
            return
        self._enter_layer()

    # -----------------------------------------------------------------
    # The five functional scripts. Each is also reachable through
    # the layer; the layer handler calls these methods directly.
    # -----------------------------------------------------------------

    @script(
        description=(
            "Check whether the AMASAMYA audit panel is open on the "
            "current browser tab and speak the result."
        ),
        gesture="kb:NVDA+alt+a",
        category="AMASAMYA",
    )
    def script_whereIsPanel(self, gesture=None):
        if not _is_supported_browser_foreground():
            _not_in_browser_message()
            return
        foreground = api.getForegroundObject()
        panel = _find_amasamya_panel_in_browser(foreground)
        page = _page_title_from_browser(foreground) or "the current page"
        if panel is not None:
            ui.message(
                "AMASAMYA panel is open on {page}. Press F6 to move "
                "focus into it.".format(page=page)
            )
        else:
            _no_panel_message(foreground)

    @script(
        description=(
            "Jump to the next failure (Critical or Serious) in the "
            "AMASAMYA panel's findings table. Sets the navigator "
            "object; does not steal focus."
        ),
        gesture="kb:NVDA+alt+n",
        category="AMASAMYA",
    )
    def script_nextFailure(self, gesture=None):
        self._walk_failure(direction=1)

    @script(
        description=(
            "Jump to the previous failure (Critical or Serious) in "
            "the AMASAMYA panel's findings table. Sets the navigator "
            "object; does not steal focus."
        ),
        gesture="kb:NVDA+alt+p",
        category="AMASAMYA",
    )
    def script_previousFailure(self, gesture=None):
        self._walk_failure(direction=-1)

    @script(
        description=(
            "Read the How-to-Fix text of the finding currently under "
            "the navigator in the AMASAMYA panel."
        ),
        gesture="kb:NVDA+alt+f",
        category="AMASAMYA",
    )
    def script_readFix(self, gesture=None):
        if not _is_supported_browser_foreground():
            _not_in_browser_message()
            return
        foreground = api.getForegroundObject()
        panel = _find_amasamya_panel_in_browser(foreground)
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
                "You are not on a finding row. Jump to the first "
                "failure first, then try again."
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

    @script(
        description=(
            "Speak the AMASAMYA audit summary: the four severity "
            "counts (failures, warnings, passes, info) in one short "
            "utterance."
        ),
        gesture="kb:NVDA+alt+u",
        category="AMASAMYA",
    )
    def script_speakSummary(self, gesture=None):
        if not _is_supported_browser_foreground():
            _not_in_browser_message()
            return
        foreground = api.getForegroundObject()
        panel = _find_amasamya_panel_in_browser(foreground)
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

    # -----------------------------------------------------------------
    # Shared walk helper for next/previous failure
    # -----------------------------------------------------------------

    def _walk_failure(self, direction):
        if not _is_supported_browser_foreground():
            _not_in_browser_message()
            return
        foreground = api.getForegroundObject()
        panel = _find_amasamya_panel_in_browser(foreground)
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
        if direction > 0:
            next_indexes = [i for i in failures if i > current]
            if not next_indexes:
                ui.message(
                    "You are on or past the last failure. Go back "
                    "with the previous-failure command."
                )
                return
            target_idx = next_indexes[0]
        else:
            prev_indexes = [i for i in failures if i < current]
            if not prev_indexes:
                ui.message(
                    "You are at or before the first failure. Go "
                    "forward with the next-failure command."
                )
                return
            target_idx = prev_indexes[-1]
        target = rows[target_idx]
        try:
            api.setNavigatorObject(target)
        except Exception:
            pass
        position = "{n} of {total} failures".format(
            n=failures.index(target_idx) + 1, total=len(failures)
        )
        ui.message(position + ".")
        _speak_row_brief(target)
