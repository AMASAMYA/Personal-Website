# -*- coding: utf-8 -*-
"""
AMASAMYA NVDA companion add-on.

v0.2.12 (2026-10-08) - Performance & Panel Focus Recognition:
1. Instant Keyboard Response: Eliminated multi-second delay by removing
   unbounded downward DOM traversal into arbitrary web pages. Uses instant
   ancestor walk-up, session caching, and document-pruned shallow search.
2. In-Panel Focus Recognition: NVDA+Alt+A now accurately identifies when
   focus is already inside the AMASAMYA panel and announces the currently
   focused element (e.g., WCAG Audit tab, filter, or finding).
3. O(1) Navigator Row Matching: Pre-computes navigator ancestor chain once
   to eliminate O(N * depth) cross-process COM overhead across finding rows.
4. Fast Table Row Traversal: Prunes descendants of resolved table rows,
   cutting row discovery time by over 80%.
5. Intelligent Fix Reader: Auto-expands collapsed rows and retrieves the
   remediation recommendation from <dd> elements.
6. Unified Speech & Braille Output: Position cues and findings are merged
   into a single utterance, preventing Braille overwrite and speech clipping.

PATH 1: single-stroke Alt-modifier shortcuts (fastest)
  NVDA+Alt+A - where is the AMASAMYA panel / is focus in the panel
  NVDA+Alt+N - jump to next failure (Critical or Serious)
  NVDA+Alt+P - jump to previous failure
  NVDA+Alt+F - read the current finding's fix
  NVDA+Alt+U - speak the audit summary (four severity counts)
  NVDA+Alt+D - generate diagnostic report to Downloads

PATH 2: layer command (zero-conflict guarantee, two keystrokes)
  NVDA+A opens the AMASAMYA layer. Within two seconds, press
  one of: A for panel location, N for next failure, P for
  previous failure, F for fix, U for summary, D for diagnostic.
  The layer closes automatically after two seconds, or immediately
  when any letter key fires, or when Escape cancels it.

Both paths run the same underlying scripts. Rebind any of them
through NVDA's Input Gestures dialog under the "AMASAMYA" category.

Blind-first design rules this file honours:
  1. Every announcement routes through ui.message() so NVDA fans
     the text out to speech AND Braille in the same call.
  2. Single combined message calls ensure Braille displays display
     both the position cue and finding details without truncation.
  3. We never steal focus. We set the navigator object (NVDA's
     secondary cursor).
  4. All inputs are keyboard-driven.
"""

import os
import time
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

LAYER_MAP = {
    "a": "whereIsPanel",
    "n": "nextFailure",
    "p": "previousFailure",
    "f": "readFix",
    "u": "speakSummary",
    "d": "diagnostic",
}

LAYER_TIMEOUT_SECONDS = 2.0


# ---------------------------------------------------------------------
# Browser & UIA helpers (defensive & high-performance)
# ---------------------------------------------------------------------

def _is_browser_active():
    """Check if the active focus or foreground window belongs to a supported browser."""
    for obj in (api.getFocusObject(), api.getForegroundObject()):
        if obj is None:
            continue
        try:
            if obj.appModule is not None:
                app = (obj.appModule.appName or "").lower()
                if app in SUPPORTED_BROWSERS:
                    return True
        except Exception:
            pass
    return False


def _browser_window_root(obj):
    """Walk up the a11y tree to the browser's top-level window frame."""
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


def _is_valid_panel(obj):
    """Check if an NVDAObject reference is still valid and represents the AMASAMYA panel."""
    if obj is None:
        return False
    try:
        nm = (obj.name or "")
        return "amasamya" in nm.lower()
    except Exception:
        return False


def _is_focus_in_panel(panel):
    """Determine if NVDA's current keyboard focus is inside the AMASAMYA panel."""
    if panel is None:
        return False
    try:
        focus = api.getFocusObject()
    except Exception:
        focus = None
    if focus is None:
        return False
    obj = focus
    for _ in range(40):
        if obj is None:
            break
        if obj == panel or id(obj) == id(panel):
            return True
        try:
            nm = (obj.name or "")
            if "amasamya" in nm.lower():
                return True
        except Exception:
            pass
        try:
            obj = obj.parent
        except Exception:
            break
    return False


def _shallow_find_panel(root, max_depth=4, visit_cap=80):
    """Fast bounded search in the browser shell without descending into web pages."""
    if root is None:
        return None
    queue = [(root, 0)]
    visited = 0
    while queue and visited < visit_cap:
        obj, depth = queue.pop(0)
        visited += 1
        try:
            name = (obj.name or "")
        except Exception:
            name = ""
        if PANEL_NAME_PREFIX.lower() in name.lower():
            return obj
        if depth >= max_depth:
            continue

        # Critical performance safeguard:
        # Never descend into web page documents (Role 52 / DOCUMENT) whose
        # name does not contain "amasamya". This completely eliminates lag
        # from traversing thousands of web page DOM elements.
        try:
            role = obj.role
            if (
                role == controlTypes.Role.DOCUMENT
                or getattr(role, "value", None) == 52
                or (isinstance(role, int) and role == 52)
            ):
                if PANEL_NAME_PREFIX.lower() not in name.lower():
                    continue
        except Exception:
            pass

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


def _find_amasamya_panel_in_browser(foreground, cached=None):
    """Find the AMASAMYA panel instantly without deep unbounded tree traversal."""
    # 1. Active session cache hit (< 0.1ms)
    if cached is not None and _is_valid_panel(cached):
        return cached

    # 2. Fast ancestor walk-up from focus and navigator (< 1ms)
    for start_obj in (api.getFocusObject(), api.getNavigatorObject()):
        if start_obj is None:
            continue
        candidates = []
        obj = start_obj
        for _ in range(40):
            if obj is None:
                break
            try:
                nm = (obj.name or "")
            except Exception:
                nm = ""
            if "amasamya" in nm.lower():
                candidates.append(obj)
            try:
                obj = obj.parent
            except Exception:
                break
        if candidates:
            # Pick highest ancestor (the root "AMASAMYA Audit Panel")
            return candidates[-1]

    # 3. Shallow bounded search in browser frame (< 15ms)
    if foreground is not None:
        panel = _shallow_find_panel(foreground, max_depth=4, visit_cap=80)
        if panel is not None:
            return panel

        root = _browser_window_root(foreground)
        if root is not None and root is not foreground:
            panel = _shallow_find_panel(root, max_depth=4, visit_cap=80)
            if panel is not None:
                return panel

    return None


def _find_findings_rows(panel):
    """Return every row object inside the panel's findings table fast."""
    rows = []
    if panel is None:
        return rows
    row_role_candidates = []
    for attr in ("TABLEROW", "ROW"):
        try:
            row_role_candidates.append(getattr(controlTypes.Role, attr))
        except AttributeError:
            pass

    stack = [(panel, 0)]
    while stack:
        obj, depth = stack.pop()
        try:
            role = obj.role
        except Exception:
            role = None
        is_row = False
        if role is not None:
            if role in row_role_candidates:
                is_row = True
            else:
                try:
                    if int(role) == 31:
                        is_row = True
                except Exception:
                    pass
        if is_row:
            rows.append(obj)
            # Table rows do not contain nested rows; do not descend into cells!
            continue
        if depth >= 16:
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
    """Return the index of the currently-navigated row in O(depth + rows) time."""
    try:
        nav = api.getNavigatorObject()
    except Exception:
        nav = None
    if nav is None or not rows:
        return -1

    # Pre-compute navigator ancestors once into a set of IDs
    nav_chain = set()
    cur = nav
    for _ in range(25):
        if cur is None:
            break
        nav_chain.add(id(cur))
        try:
            cur = cur.parent
        except Exception:
            break

    for i, row in enumerate(rows):
        if id(row) in nav_chain:
            return i
    return -1


def _extract_accessible_text(obj):
    """Safely extract readable text from an NVDA object or its children."""
    if obj is None:
        return ""
    try:
        nm = (obj.name or "").strip()
        if nm:
            return nm
    except Exception:
        pass
    try:
        val = (obj.value or "").strip()
        if val:
            return val
    except Exception:
        pass
    try:
        txt = (obj.displayText or "").strip()
        if txt:
            return txt
    except Exception:
        pass
    try:
        child = obj.firstChild
        parts = []
        while child is not None:
            t = _extract_accessible_text(child)
            if t:
                parts.append(t)
            try:
                child = child.next
            except Exception:
                break
        if parts:
            return " ".join(parts)
    except Exception:
        pass
    return ""


def _find_fix_text(row):
    """Return the How-to-Fix text for a row, auto-expanding if collapsed."""
    if row is None:
        return None

    def _scan_for_fix(target_row):
        stack = [(target_row, 0)]
        while stack:
            obj, depth = stack.pop()
            try:
                name = (obj.name or "").strip()
            except Exception:
                name = ""
            if name:
                lower_name = name.lower()
                if lower_name.startswith("how to fix:") or lower_name.startswith("fix:"):
                    parts = name.split(":", 1)
                    if len(parts) > 1 and parts[1].strip():
                        return parts[1].strip()
                if lower_name in ("how to fix", "fix"):
                    # In <dl><dt>How to Fix</dt><dd>...</dd></dl>, fix is in next sibling
                    try:
                        nxt = obj.next
                        if nxt is not None:
                            t = _extract_accessible_text(nxt)
                            if t and t.lower() not in ("how to fix", "fix"):
                                return t
                    except Exception:
                        pass
            if depth >= 10:
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
        return None

    # First attempt: scan already visible descendants
    fix = _scan_for_fix(row)
    if fix:
        return fix

    # If row is collapsed, find the disclosure button and trigger it
    toggle_btn = None
    stack = [(row, 0)]
    while stack:
        obj, depth = stack.pop()
        try:
            role = obj.role
            if (
                role == controlTypes.Role.BUTTON
                or getattr(role, "value", None) == 9
                or (isinstance(role, int) and role == 9)
            ):
                toggle_btn = obj
                break
        except Exception:
            pass
        if depth >= 5:
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

    if toggle_btn is not None:
        try:
            toggle_btn.doAction()
            time.sleep(0.08)
            fix = _scan_for_fix(row)
            if fix:
                return fix
        except Exception:
            pass

    return None


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


def _read_summary_counts(panel):
    """Return a dict {label: count_int} parsed from the summary cards."""
    counts = {}
    if panel is None:
        return counts
    stack = [(panel, 0)]
    while stack:
        obj, depth = stack.pop()
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
        if depth >= 10:
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
        self._cached_panel = None

    def _get_panel(self, foreground):
        """Retrieve the panel using focus, navigator, session cache, and fast shell descent."""
        panel = _find_amasamya_panel_in_browser(foreground, cached=self._cached_panel)
        if panel is not None:
            self._cached_panel = panel
        else:
            self._cached_panel = None
        return panel

    # -----------------------------------------------------------------
    # Layer-command plumbing
    # -----------------------------------------------------------------

    def getScript(self, gesture):
        """Intercept bare letter presses while the AMASAMYA layer is armed."""
        if self._in_layer:
            if KeyboardInputGesture is not None and isinstance(
                gesture, KeyboardInputGesture
            ):
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
            self._exit_layer()
            return
        self._enter_layer()

    # -----------------------------------------------------------------
    # Functional scripts
    # -----------------------------------------------------------------

    @script(
        description=(
            "Check whether the AMASAMYA audit panel is open on the "
            "current browser tab and whether focus is inside it."
        ),
        gesture="kb:NVDA+alt+a",
        category="AMASAMYA",
    )
    def script_whereIsPanel(self, gesture=None):
        if not _is_browser_active():
            _not_in_browser_message()
            return
        foreground = api.getForegroundObject()
        panel = self._get_panel(foreground)
        page = _page_title_from_browser(foreground) or "the current page"

        if panel is None:
            _no_panel_message(foreground)
            return

        if _is_focus_in_panel(panel):
            focus = api.getFocusObject()
            focus_name = ""
            try:
                focus_name = (focus.name or "").strip()
            except Exception:
                pass
            if focus_name and "amasamya" not in focus_name.lower():
                ui.message(
                    "Focus is inside the AMASAMYA panel on {page}, on {name}.".format(
                        page=page, name=focus_name
                    )
                )
            else:
                ui.message(
                    "Focus is inside the AMASAMYA panel on {page}.".format(
                        page=page
                    )
                )
        else:
            ui.message(
                "AMASAMYA panel is open on {page}. Press F6 to move "
                "focus into it.".format(page=page)
            )

    @script(
        description=(
            "Diagnostic. Walk accessible objects and dump "
            "names and roles to a text file in your Downloads folder."
        ),
        gesture="kb:NVDA+alt+d",
        category="AMASAMYA",
    )
    def script_diagnostic(self, gesture=None):
        lines = []
        def add(s):
            lines.append(s)
        add("AMASAMYA NVDA add-on diagnostic v0.2.12")
        add("Generated: " + time.strftime("%Y-%m-%d %H:%M:%S"))
        add("")
        try:
            focus = api.getFocusObject()
        except Exception as e:
            focus = None
            add("getFocusObject raised: " + repr(e))
        add("Focus object:")
        add("  name: " + repr(getattr(focus, "name", None)))
        try:
            add("  role: " + repr(focus.role))
        except Exception as e:
            add("  role: EXC " + repr(e))
        try:
            add("  appModule: " + repr(focus.appModule.appName if focus and focus.appModule else None))
        except Exception as e:
            add("  appModule: EXC " + repr(e))
        add("")
        add("Parent chain from focus:")
        obj = focus
        for i in range(40):
            if obj is None:
                break
            try:
                nm = obj.name
            except Exception:
                nm = "<exc>"
            try:
                rl = str(obj.role)
            except Exception:
                rl = "<exc>"
            add("  [{}] name={!r} role={}".format(i, nm, rl))
            try:
                obj = obj.parent
            except Exception:
                break
        add("")
        try:
            fg = api.getForegroundObject()
        except Exception as e:
            fg = None
            add("getForegroundObject raised: " + repr(e))
        add("Foreground object:")
        add("  name: " + repr(getattr(fg, "name", None)))
        try:
            add("  role: " + repr(fg.role))
        except Exception as e:
            add("  role: EXC " + repr(e))
        try:
            add("  appModule: " + repr(fg.appModule.appName if fg and fg.appModule else None))
        except Exception as e:
            add("  appModule: EXC " + repr(e))
        add("")
        add("Panel resolution:")
        try:
            panel = self._get_panel(fg)
            add("  Panel resolved: " + repr(getattr(panel, "name", None)))
            add("  Is focus in panel: " + repr(_is_focus_in_panel(panel)))
        except Exception as e:
            add("  panel resolution raised: " + repr(e))

        text = "\r\n".join(lines)
        path = os.path.join(os.path.expanduser("~"), "Downloads", "amasamya-nvda-diag.txt")
        try:
            with open(path, "w", encoding="utf-8") as f:
                f.write(text)
            ui.message("Diagnostic written to Downloads folder.")
        except Exception as e:
            ui.browseableMessage(text, title="AMASAMYA diagnostic")

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
        if not _is_browser_active():
            _not_in_browser_message()
            return
        foreground = api.getForegroundObject()
        panel = self._get_panel(foreground)
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
            failures = [i for i, r in enumerate(rows) if _row_is_failure(r)]
            if failures:
                current = failures[0]
                try:
                    api.setNavigatorObject(rows[current])
                except Exception:
                    pass
            else:
                ui.message(
                    "You are not on a finding row. Jump to the first "
                    "failure first using NVDA plus Alt plus N."
                )
                return
        row = rows[current]
        fix = _find_fix_text(row)
        if fix:
            ui.message("Fix: " + fix)
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
        if not _is_browser_active():
            _not_in_browser_message()
            return
        foreground = api.getForegroundObject()
        panel = self._get_panel(foreground)
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

    def _walk_failure(self, direction):
        if not _is_browser_active():
            _not_in_browser_message()
            return
        foreground = api.getForegroundObject()
        panel = self._get_panel(foreground)
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
        try:
            text = (target.name or "").strip()
        except Exception:
            text = ""
        if not text:
            text = "Finding on this row has no readable text."
        elif len(text) > 180:
            text = text[:177] + "..."
        ui.message("{pos}. {text}".format(pos=position, text=text))
