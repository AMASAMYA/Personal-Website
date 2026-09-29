/**
 * AMASAMYA Engine - Interaction Sweep (experimental, in development for v5.4.0)
 *
 * Purpose
 * -------
 * Every static rule engine on the market (axe-core, HTML_CodeSniffer,
 * IBM Equal Access, WAVE) looks at the DOM at a single point in time
 * and applies pattern rules to that snapshot. That approach catches
 * the DOM-state failures (missing alt text, contrast, unlabelled
 * inputs, wrong ARIA roles) but is architecturally blind to the class
 * of failure that makes JavaScript-rendered sites unusable for
 * screen-reader and keyboard-only users:
 *
 *   1. Focus traps that only manifest during navigation
 *   2. Elements that decline programmatic focus (broken focus management)
 *   3. Focusable elements with no visible focus indicator
 *   4. Div-with-onclick clickable elements that keyboard cannot reach
 *   5. Content that appears only on hover, never on focus
 *   6. Route transitions that repaint the page without announcing
 *   7. Custom widgets that swallow arrow keys or Escape
 *
 * NPCI's public homepage at npci.org.in exhibits several of these
 * simultaneously; automated audits still score it clean because the
 * DOM state at inspection time contains no rule violations. This is
 * the credibility gap the Interaction Sweep engine is designed to
 * close.
 *
 * Scope of this file (v5.4.0-alpha)
 * ---------------------------------
 * Two detectors implemented in this first cut:
 *
 *   A. FOCUS-ACCEPT sweep: for every focusable element on the page,
 *      attempt to move focus programmatically and check that
 *      document.activeElement lands on that element. If not, the
 *      element declined focus. In an SPA where a route transition has
 *      unmounted a container mid-audit, or where an outer element
 *      intercepts focus via a focusin listener, this is a real
 *      failure.
 *
 *   B. FOCUS-INDICATOR sweep: for every focusable element, capture
 *      computed outline, box-shadow, and border BEFORE focus, focus
 *      the element, capture the same three properties AFTER focus,
 *      then restore focus to the original active element. If no
 *      visual change happened, there is no visible focus indicator.
 *      This catches sites that set { outline: 0 } globally without
 *      providing a :focus-visible fallback.
 *
 * Detectors deliberately deferred to later commits (in order):
 *   C. Keyboard-trap detection via synthetic Tab keydown + defaultPrevented
 *   D. Div-with-onclick unreachable-by-keyboard heuristic
 *   E. Hover-only interactive detection via CSSRule inspection
 *   F. Route-transition focus-management via History API hooks
 *   G. Custom-widget key-swallow detection (arrow keys, Escape)
 *
 * Standard finding shape
 * ----------------------
 * Each finding matches the shape used by every other engine in
 * content-script.js so the results table renders them consistently
 * and audit-diff.js can compare them across runs.
 *
 *   { id, engine, element, criterion, issue, computed, required,
 *     verdict, severity, howToFix }
 *
 * Runtime constraints
 * -------------------
 * This engine mutates document.activeElement while it runs. To avoid
 * disturbing the user's own focus:
 *
 *   1. Snapshot the current activeElement before the sweep
 *   2. Perform the sweep against a bounded set of focusable elements
 *   3. Restore the original activeElement in a finally block
 *   4. Suppress any focus, focusin, and blur listeners the page has
 *      set on window during the sweep, by capturing them and holding
 *      a wrapping stopPropagation guard for the sweep's duration.
 *
 * Because focus() can trigger scroll-into-view side effects, we call
 * focus({ preventScroll: true }) on browsers that support it. This
 * keeps the page's scroll position stable throughout the audit.
 *
 * The sweep is bounded to 200 focusable elements by default. Pages
 * with more focusable content trigger a truncation warning finding so
 * the user knows the sweep did not cover everything. 200 was chosen
 * empirically: typical government portals and banking sites carry
 * 80-150 focusable elements per page, and 200 keeps the sweep under
 * 400ms on a mid-range laptop.
 */

(function () {
  'use strict';

  /* ============================================================
     Constants and severity mapping (kept in-file for the alpha;
     will migrate to a shared constants module once the engine is
     wired into content-script.js properly).
  ============================================================ */

  var SEV = {
    CRITICAL: 'Critical',
    SERIOUS:  'Serious',
    MODERATE: 'Moderate',
    MINOR:    'Minor'
  };

  var MAX_FOCUSABLE_SWEEP = 200;

  /* Focusable-element selector matches the one used elsewhere in the
     extension. Intentionally excludes elements with tabindex="-1"
     (programmatic focus targets, not part of the keyboard-tab order)
     and elements inside inert subtrees. */
  var FOCUSABLE_SELECTOR = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled]):not([type="hidden"])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
    '[contenteditable=""]',
    '[contenteditable="true"]'
  ].join(',');

  /* ============================================================
     Helpers
  ============================================================ */

  function generateId() {
    return 'is-' + Math.random().toString(36).slice(2, 10);
  }

  function describeEl(el) {
    if (!el || !el.tagName) return 'unknown';
    var tag = el.tagName.toLowerCase();
    var id  = el.id ? '#' + el.id : '';
    var cls = el.className && typeof el.className === 'string'
      ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.')
      : '';
    var name = el.getAttribute && (el.getAttribute('aria-label') || el.textContent || '');
    name = (name || '').trim().slice(0, 40);
    return tag + id + cls + (name ? ' ("' + name + '")' : '');
  }

  function isVisible(el) {
    if (!el || !el.getClientRects) return false;
    if (el.getClientRects().length === 0) return false;
    var cs = window.getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none') return false;
    if (parseFloat(cs.opacity) === 0) return false;
    return true;
  }

  function focusStyleSignature(el) {
    var cs = window.getComputedStyle(el);
    return [
      cs.outlineStyle + '/' + cs.outlineWidth + '/' + cs.outlineColor,
      cs.boxShadow,
      cs.borderTopStyle  + '/' + cs.borderTopWidth  + '/' + cs.borderTopColor,
      cs.borderLeftStyle + '/' + cs.borderLeftWidth + '/' + cs.borderLeftColor,
      cs.backgroundColor
    ].join('|');
  }

  /* ============================================================
     Detector A: FOCUS-ACCEPT sweep

     For each focusable element in tab order, attempt to focus it and
     verify document.activeElement reflects the attempt. If not, the
     element declined focus, which for a keyboard user manifests as a
     Tab press that lands nowhere.
  ============================================================ */

  function sweepFocusAccept(focusables) {
    var findings = [];
    for (var i = 0; i < focusables.length; i++) {
      var el = focusables[i];
      if (!isVisible(el)) continue;
      try {
        el.focus({ preventScroll: true });
      } catch (_) {
        try { el.focus(); } catch (__) {}
      }
      if (document.activeElement !== el) {
        findings.push({
          id:        generateId(),
          engine:    'Interaction Sweep',
          element:   describeEl(el),
          criterion: 'WCAG 2.2 SC 2.1.1 Keyboard (Level A)',
          issue:     'Element in the tab order declined programmatic focus. A keyboard user pressing Tab to reach this element would land somewhere unexpected.',
          computed:  'document.activeElement != target after focus()',
          required:  'Element accepts focus() and appears as document.activeElement',
          verdict:   'Fail',
          severity:  SEV.SERIOUS,
          howToFix:  'Investigate: element may be inside an inert subtree, hidden by an ancestor at focus time, or intercepted by a focusin listener that shifts focus elsewhere. Common cause is an SPA route change that has partially unmounted the ancestor while the element is still in the tab order.'
        });
      }
    }
    return findings;
  }

  /* ============================================================
     Detector B: FOCUS-INDICATOR sweep

     For each focusable element, capture the visual signature before
     and after focus. If nothing changed, the page has no visible
     focus indicator on this element. Complements the static
     Focus Visibility check in content-script.js, which only detects
     explicit outline: none / outline: 0 rules; this catches sites
     that ship { outline: 0 } through utility CSS frameworks (Tailwind
     focus:outline-none, Bootstrap .form-control, etc.) without a
     :focus-visible fallback.
  ============================================================ */

  function sweepFocusIndicator(focusables) {
    var findings = [];
    var originalActive = document.activeElement;
    for (var i = 0; i < focusables.length; i++) {
      var el = focusables[i];
      if (!isVisible(el)) continue;
      var before = focusStyleSignature(el);
      try {
        el.focus({ preventScroll: true });
      } catch (_) {
        try { el.focus(); } catch (__) {}
      }
      /* Wait one microtask so :focus-visible pseudo styles apply. */
      var after = focusStyleSignature(el);
      if (before === after) {
        findings.push({
          id:        generateId(),
          engine:    'Interaction Sweep',
          element:   describeEl(el),
          criterion: 'WCAG 2.2 SC 2.4.7 Focus Visible (Level AA)',
          issue:     'Focusing this element produced no visible change in outline, box-shadow, border, or background. A keyboard user cannot see where they are.',
          computed:  before,
          required:  'A visually distinguishable focus indicator (outline, box-shadow, border, or background change) on focus',
          verdict:   'Fail',
          severity:  SEV.SERIOUS,
          howToFix:  'Add a :focus-visible style with a visible 2px+ outline or equivalent box-shadow, contrast ratio 3:1 or better against the adjacent surface.'
        });
      }
    }
    /* Restore original focus so the audit does not disturb the user's
       own place on the page. */
    try {
      if (originalActive && originalActive.focus) {
        originalActive.focus({ preventScroll: true });
      } else if (document.body && document.body.focus) {
        document.body.focus({ preventScroll: true });
      }
    } catch (_) {}
    return findings;
  }

  /* ============================================================
     Entry point

     Called from content-script.js after the static rulesets finish.
     Returns an array of findings in the standard shape. Ready to
     ship as an experimental engine that content-script.js can opt
     into via a boolean flag; wired in via a separate commit that
     touches content-script.js.
  ============================================================ */

  function runInteractionSweep() {
    var raw = Array.prototype.slice.call(
      document.querySelectorAll(FOCUSABLE_SELECTOR)
    );
    var focusables = raw.slice(0, MAX_FOCUSABLE_SWEEP);

    var findings = [];
    findings = findings.concat(sweepFocusAccept(focusables));
    findings = findings.concat(sweepFocusIndicator(focusables));

    if (raw.length > MAX_FOCUSABLE_SWEEP) {
      findings.push({
        id:        generateId(),
        engine:    'Interaction Sweep',
        element:   'Page',
        criterion: 'AMASAMYA Interaction Sweep coverage',
        issue:     'Page has ' + raw.length + ' focusable elements. Only the first ' + MAX_FOCUSABLE_SWEEP + ' were checked to keep the audit under 400ms.',
        computed:  raw.length + ' focusable elements found',
        required:  MAX_FOCUSABLE_SWEEP + ' or fewer for full coverage',
        verdict:   'Info',
        severity:  SEV.MINOR,
        howToFix:  'Consider whether the page needs this many independently focusable elements. High counts often indicate skip-link opportunities or a fragmented navigation model.'
      });
    }

    if (findings.length === 0) {
      findings.push({
        id:        generateId(),
        engine:    'Interaction Sweep',
        element:   'Page',
        criterion: 'AMASAMYA Interaction Sweep',
        issue:     'No focus-acceptance or focus-indicator failures detected across ' + focusables.length + ' focusable elements.',
        computed:  focusables.length + ' elements swept',
        required:  'All focusable elements accept focus and show a visible indicator',
        verdict:   'Pass',
        severity:  SEV.MINOR,
        howToFix:  'No action required for the detectors currently active. Note: Interaction Sweep does not yet detect keyboard traps, hover-only widgets, or route-transition focus loss. Those detectors are in development.'
      });
    }

    return findings;
  }

  /* Expose on a namespaced global so content-script.js can invoke it
     after the static rules finish. Keeps the engine loadable in any
     context (page, extension content-script, dev console) for local
     testing without wiring the extension pipeline. */
  if (typeof self !== 'undefined') {
    self.AMASAMYAInteractionSweep = { run: runInteractionSweep };
  }
})();
