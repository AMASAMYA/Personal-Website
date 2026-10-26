False-positive sweep: v5.4.1 release gate methodology

Purpose
=======

Measure the per-detector false-positive rate of the AMASAMYA browser
extension against five diverse real-world sites. Produce a ranked list of
detectors by false-positive count so that the top three go into the next
release's fix queue. Repeat this sweep every minor release so stability
regressions do not accumulate quietly between features.

Why this exists
===============

v5.4.1 fixed 224 false positives on npci.org.in by rewriting the
focus-indicator detector. That was reactive: one user, one site, one
bug report. This sweep is proactive. It runs the same detector set
against five sites you did not design the rules for, counts the
duplicated and spurious findings, and tells you which detector to
rewrite before the next user discovers it.

Site panel
==========

Five sites, picked for DOM-pattern diversity, framework diversity, and
compliance stakes. Replace any site that becomes unavailable with one
in the same category.

1. Government / server-rendered legacy. https://uidai.gov.in
   Aadhaar. Legally mandated accessible under India's Rights of Persons
   with Disabilities Act. Classic server-rendered multi-page site, lots
   of static HTML, old-school table layouts in places.

2. Banking / mixed SPA. https://www.hdfcbank.com
   Private-sector bank. High-stakes compliance. Dynamic widgets layered
   on top of static chrome. Known to carry a cocktail of modal patterns,
   iframes, and legacy jQuery alongside modern components.

3. News / high-traffic. https://www.thehindu.com
   Dense article listings, embedded media, infinite scroll, ad slots.
   Exercises image / contrast / heading-structure detectors harder than
   anything else on this list.

4. SaaS / modern SPA. https://www.notion.so
   React-heavy, contenteditable surfaces, custom focus management, aria-
   live regions. The failure modes of modern SPAs look nothing like
   those of a static site; this one catches detectors that assume a
   stable DOM.

5. E-commerce. https://www.flipkart.com
   Business-critical. Thousands of product tiles with repeated patterns,
   which is exactly where the finding-clustering pass added in v5.4.1
   earns or fails its keep.

For each run, choose one landing page per site (home, article, product,
dashboard, whichever is the default entry). Do NOT run against logged-in
flows for this sweep; the goal is comparability across sites, not depth
on any one site.

Procedure per site
==================

Prerequisites: Chrome with the AMASAMYA extension at the version under
test. Browser history and extension storage cleared at the start of each
sweep so the audit history diff does not interfere.

1. Open the site's landing URL in a fresh Chrome tab.
2. Wait for the page to settle. Give modern SPAs 3-5 seconds to finish
   their initial render before invoking the audit.
3. Press Alt+Shift+1 to open the AMASAMYA panel.
4. Press F6 until focus is inside the panel.
5. Activate the Re-run Audit button.
6. Wait for the audit to complete. The panel's summary header will
   update with the four counts and the total.
7. In the Export section, activate the JSON button. Save the file as
   Test Reports/false-positive-sweep/<version>/<site>-<YYYY-MM-DD>.json
   where <site> is the short slug from the Site panel section
   (uidai, hdfcbank, thehindu, notion, flipkart).
8. Repeat for the remaining sites in the panel.

Keep the extension version constant across the five runs. If a patch
ships mid-sweep, start over.

Aggregation
===========

Each JSON export carries a findings array where each finding has an
engine identifier (the detector that produced it) and a message string.
The sweep's output is a per-detector table with four columns:

- detector: the engine identifier string, exactly as the extension emits
  it.
- total_findings: the count of all findings this detector produced
  across all five sites.
- unique_messages: the number of distinct message strings this detector
  produced. A detector that fires 174 times with the same message on one
  page is almost certainly producing a false-positive cluster.
- duplication_ratio: total_findings divided by unique_messages. Values
  above 5 are suspicious; above 20 are almost always wrong.

Compute the table from the five JSON files with the aggregation script
below (save as scripts/aggregate-false-positive-sweep.js in the
repo). The script writes a markdown table to stdout; redirect it to
Test Reports/false-positive-sweep/<version>/aggregate-<date>.md.

Triage per detector
===================

For every detector in the top five by total_findings, spot-check five
findings pulled at random from the sweep:

- Open the source site in Chrome.
- Use the finding's element selector to locate the element with
  document.querySelector(selector) in the DevTools console (not a visual
  locator; the selector is the identifier).
- Verify the detector's claim against the actual DOM, computed CSS, and
  (where relevant) NVDA announcement when Tab lands on the element.
- Classify each spot-check as one of:
    confirmed_true_positive: the detector is right.
    confirmed_false_positive: the detector is wrong.
    needs_manual_verification: ambiguous; the detector may be
      technically correct but the user impact is unclear.
- Record the per-detector FP rate: confirmed_false_positive divided by
  the five spot-checks.

A detector with FP rate above 40% goes into the fix queue for the next
release. A detector above 80% ships a patch within one release cycle,
not merged into a feature release.

Fix-queue output
================

The sweep produces a short markdown report at
Test Reports/false-positive-sweep/<version>/fix-queue-<date>.md with
exactly three sections:

1. "Rewrite now": detectors with FP rate above 80%. Each entry names
   the detector, the specific wrong-case pattern seen (one sentence),
   and the suspected cause (one sentence).
2. "Rewrite next release": detectors with FP rate between 40% and 80%.
3. "Monitor": detectors with FP rate between 20% and 40%, so the next
   sweep can check whether the rate has drifted.

Repeat cadence
==============

Run the sweep against every minor release before approving the
Chrome / Edge / Firefox store upload. The sweep takes under 90 minutes
end to end when the aggregation script is already in place. That is
cheap compared to a false-positive-driven review-cycle rework.

Keep every sweep's exports in Test Reports/false-positive-sweep/ by
version. The per-detector trend across versions is itself useful: a
detector whose FP rate climbs over three releases is a candidate for
rewrite even if its absolute rate stays below the 40% threshold.
