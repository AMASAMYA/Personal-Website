// @ts-check
//
// VPAT / ACR export guard.
//
// This export is the one artefact AMASAMYA produces that a compliance officer
// may rely on, so wrong content here is worse than a bug anywhere else in the
// product. Three things had gone wrong at once before this test existed:
//
//   1. The report was titled VPAT 2.4 while VPAT 2.5Rev (ITI, April 2025) is
//      the first edition whose WCAG table covers WCAG 2.2, which is what the
//      engines actually test against.
//   2. It emitted "Supports with Exceptions", the conformance value 2.5
//      retired in favour of "Partially Supports".
//   3. The GIGW 3.0 and IS 17802 columns carried invented references
//      ("Rule 4.1", "IS 17802 Sec 5.1") and one wrong figure, 48dp, which is
//      the Android Material target size rather than the 24x24 CSS pixels that
//      SC 2.5.8 requires at Level AA.
//
// Verified references, for anyone changing these:
//   - GIGW 3.0 sets its baseline at WCAG 2.1 Level AA as a whole and does not
//     restate success criteria under its own numbering, so there is no GIGW
//     clause number to cite for an individual criterion.
//   - IS 17802 Part 1:2021 adopts EN 301 549 V3.2.1, whose clauses 9.1 to 9.4
//     restate the WCAG 2.1 Level A and AA criteria with a "9." prefix, so
//     1.4.3 becomes 9.1.4.3 and 2.4.7 becomes 9.2.4.7. Criteria added in
//     WCAG 2.2, and any Level AAA criterion, have no counterpart clause.

const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const PANELS = {
  chrome:  path.resolve(__dirname, '..', '..', 'amasamya-extension', 'sidepanel', 'panel.js'),
  firefox: path.resolve(__dirname, '..', '..', 'ama11y-extension-firefox', 'sidebar', 'panel.js')
};

/**
 * Strip comments before a negative assertion. The source legitimately names
 * the retired terminology and the invented references in comments explaining
 * why they were removed; matching on those would fail the very test that
 * documents the fix.
 */
function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

/** Pull the generateVpatReport function body out of the panel source. */
function vpatSource(file) {
  const src = fs.readFileSync(file, 'utf-8');
  const start = src.indexOf('function generateVpatReport()');
  expect(start, `generateVpatReport not found in ${file}`).toBeGreaterThan(-1);
  const end = src.indexOf('/* ── SARIF', start);
  expect(end, `could not find the end of generateVpatReport in ${file}`).toBeGreaterThan(start);
  return src.slice(start, end);
}

for (const [name, file] of Object.entries(PANELS)) {
  test.describe(`VPAT / ACR export (${name})`, () => {

    test('uses VPAT 2.5 conformance terminology', () => {
      const src = vpatSource(file);
      expect(src).toContain("'Partially Supports'");
      // The value 2.5 retired. Shipping it under a 2.5 heading would be wrong.
      expect(stripComments(src)).not.toContain('Supports with Exceptions');
    });

    test('is labelled VPAT 2.5, not an earlier edition', () => {
      const src = fs.readFileSync(file, 'utf-8');
      expect(src).toContain('VPAT 2.5 / ACR Accessibility Conformance Report');
      expect(stripComments(src)).not.toContain('VPAT 2.4');
    });

    test('cites only verified IS 17802 clause numbers', () => {
      const src = vpatSource(file);
      // EN 301 549 clause 9 numbering, mirrored by IS 17802 Part 1.
      expect(src).toContain('Part 1, clause 9.1.1.1');   // WCAG 1.1.1
      expect(src).toContain('Part 1, clause 9.1.4.3');   // WCAG 1.4.3
      expect(src).toContain('Part 1, clause 9.2.4.7');   // WCAG 2.4.7
    });

    test('does not reintroduce invented standards references', () => {
      const src = vpatSource(file);
      for (const invented of ['Rule 4.1', 'Rule 5.2', 'Rule 6.3', 'Rule 7.1',
                              'IS 17802 Sec', '48dp']) {
        expect(stripComments(src), `"${invented}" is not a real reference`).not.toContain(invented);
      }
    });

    test('marks WCAG 2.2 and AAA criteria as uncovered by the Indian instruments', () => {
      const src = vpatSource(file);
      // 2.4.11 and 2.5.8 are WCAG 2.2 additions; 2.5.5 is Level AAA.
      for (const sc of ['2.4.11', '2.5.8', '2.5.5']) {
        expect(src, `${sc} should appear as its own row`).toContain(`'${sc}'`);
      }
      expect(src).toContain('Not covered: baseline is WCAG 2.1');
      expect(src).toContain('Not covered: adopts EN 301 549 V3.2.1');
      expect(src).toContain('Not covered: clause 9 covers Levels A and AA only');
      // A reader must not mistake "not covered" for a failure of the page.
      expect(src).toContain('describes the standard, not this page');
    });

    test('gives each success criterion its own row and level', () => {
      const src = vpatSource(file);
      // The old table put 2.5.5 (AAA) and 2.5.8 (AA) in one row labelled AA,
      // and 2.4.7 with 2.4.11. Neither grouping can carry a correct reference.
      expect(stripComments(src)).not.toContain("'2.5.5 / 2.5.8'");
      expect(stripComments(src)).not.toContain("'2.4.7 / 2.4.11'");
      expect(src).toContain("'Target Size (Enhanced)', '2.5.5', 'AAA'");
      expect(src).toContain("'Target Size (Minimum)', '2.5.8', 'AA'");
    });
  });
}

test('both extension builds generate an identical VPAT report', () => {
  // The Chrome side panel and the Firefox sidebar ship the same exporter.
  // A fix applied to one and not the other means two different compliance
  // documents from one product, which is how the 48dp error survived.
  expect(vpatSource(PANELS.chrome)).toEqual(vpatSource(PANELS.firefox));
});
