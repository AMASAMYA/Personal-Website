// @ts-check
const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

test.describe('AMASAMYA Academy Accessibility Audits (WCAG 2.2 AA / AAA)', () => {

  test('academy.html - Structural landmarks, heading hierarchy, and skip link', async ({ page }) => {
    await page.goto('http://localhost:3000/academy.html');

    // 1. Skip link
    const skipLink = page.locator('a.skip-link');
    await expect(skipLink).toHaveAttribute('href', '#main-content');

    // 2. Banner, Nav, Main, Contentinfo landmarks
    await expect(page.locator('header[role="banner"]')).toBeVisible();
    await expect(page.locator('nav[role="navigation"]')).toBeVisible();
    await expect(page.locator('main#main-content')).toBeVisible();
    await expect(page.locator('footer[role="contentinfo"]')).toBeVisible();

    // 3. Single H1 on page
    const h1Count = await page.locator('h1').count();
    expect(h1Count).toBe(1);
    await expect(page.locator('h1')).toHaveText(/AMASAMYA Academy/);

    // 4. Live announcer region exists with aria-live polite
    const announcer = page.locator('#live-announcer');
    await expect(announcer).toHaveAttribute('aria-live', 'polite');
  });

  test('academy.html - Keyboard operable syllabus accordion & ARIA states', async ({ page }) => {
    await page.goto('http://localhost:3000/academy.html');

    // Track A starts expanded
    const trackABtn = page.locator('button:has-text("Track A: English Foundations")');
    await expect(trackABtn).toHaveAttribute('aria-expanded', 'true');

    // Track B starts collapsed
    const trackBBtn = page.locator('button:has-text("Track B: Corporate & Business Writing")');
    await expect(trackBBtn).toHaveAttribute('aria-expanded', 'false');

    // Toggle Track B
    await trackBBtn.click();
    await expect(trackBBtn).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('#track-b-list')).toBeVisible();

    // Select lesson 2.1
    const lesson21Btn = page.locator('button:has-text("2.1 High-Impact Executive Business Emails")');
    await lesson21Btn.click();

    // Verify workspace updates and receives focus
    await expect(page.locator('#current-lesson-title')).toHaveText('2.1 High-Impact Executive Business Emails');
    await expect(page.locator('#live-announcer')).toHaveText(/Loaded 2.1 High-Impact Executive Business Emails/);
  });

  test('academy.html - Accessible audio player controls & keyboard shortcuts', async ({ page }) => {
    await page.goto('http://localhost:3000/academy.html');

    const playBtn = page.locator('#btn-play');
    await expect(playBtn).toHaveText('Play Lecture');

    // Toggle play
    await playBtn.click();
    await expect(playBtn).toHaveText('Pause Lecture');
    await expect(page.locator('#live-announcer')).toHaveText(/Audio lecture playing at 1x speed/);

    // Keyboard shortcut K when not in text input
    await page.keyboard.press('k');
    await expect(playBtn).toHaveText('Play Lecture');
    await expect(page.locator('#live-announcer')).toHaveText(/Audio lecture paused/);

    // Speed select
    const speedSelect = page.locator('#speed-select');
    await speedSelect.selectOption('1.5');
    await expect(page.locator('#live-announcer')).toHaveText('Playback speed set to 1.5x.');
  });

  test('academy.html - Audio-to-text drafting studio & copyediting checklist', async ({ page }) => {
    await page.goto('http://localhost:3000/academy.html');

    const draftArea = page.locator('#student-draft');
    await draftArea.fill('Our team audited the portal and resolved three critical focus traps.');

    // Verify statistics updated
    await expect(page.locator('#stat-words')).toHaveText('Words: 11');
    await expect(page.locator('#stat-sentences')).toHaveText('Sentences: 1');

    // Check checklist items
    const chk1 = page.locator('#chk-1');
    await chk1.check();
    await expect(page.locator('#live-announcer')).toHaveText('1 of 4 copyediting checklist items verified.');

    // Evaluate draft
    const evalBtn = page.locator('button:has-text("Evaluate Draft Against Rubric")');
    await evalBtn.click();
    await expect(page.locator('#rubric-feedback')).toContainText('Concise sentence structure');
  });

  test('academy-author.html - Form labels, audio station, and JSON export', async ({ page }) => {
    await page.goto('http://localhost:3000/academy-author.html');

    // 1. Skip link & Title
    await expect(page.locator('a.skip-link')).toHaveAttribute('href', '#main-content');
    await expect(page.locator('h1')).toHaveText(/AMASAMYA Blind-Educator Studio/);

    // 2. All form fields have explicit labels
    const inputs = ['#track-select', '#lesson-title-input', '#instructor-input', '#notes-input', '#sample-input', '#quiz-q-input', '#opt-a-input', '#opt-b-input', '#opt-c-input', '#correct-opt-select', '#exp-input'];
    for (const sel of inputs) {
      const el = page.locator(sel);
      const id = await el.getAttribute('id');
      const label = page.locator(`label[for="${id}"]`);
      await expect(label).toBeAttached();
    }

    // 3. Export JSON functionality
    await page.locator('#lesson-title-input').fill('Test Lesson 1.0');
    await page.locator('#notes-input').fill('Sample principle note.');
    await page.locator('button[type="submit"]:has-text("Export Lesson Package (JSON)")').click();

    await expect(page.locator('#json-output')).toBeVisible();
    const jsonVal = await page.locator('#json-output').inputValue();
    expect(jsonVal).toContain('"title": "Test Lesson 1.0"');
    await expect(page.locator('#author-announcer')).toHaveText(/Lesson package exported successfully/);
  });

  test('Zero em-dashes across every published surface', async () => {
    // The previous version of this test checked two files for two spellings.
    // Three em-dashes still shipped, percent-encoded inside share links on
    // blog posts, because neither the file list nor the spelling list reached
    // them. This walks every published source file and checks every encoding.
    const ROOT = path.join(__dirname, '../..');
    const SKIP_DIRS = new Set([
      'node_modules', '_archived', 'test-results', 'coverage', 'dist', '.git',
      'amasamya-public-repo', 'amasamya-extension', 'ama11y-extension-firefox',
      'beta', 'voiceover_audio_guide', 'store-assets', 'Screenshots'
    ]);
    const EXTS = new Set(['.html', '.js', '.css', '.xml', '.json', '.md']);

    // Built from char codes so this file never trips its own assertion.
    const EM = String.fromCharCode(0x2014);
    const SPELLINGS = [
      EM,                                    // literal U+2014
      '&' + 'mdash;',                        // named entity
      '&#' + '8212;',                        // decimal entity
      '&#x' + '2014;',                       // hex entity
      '%E2%80' + '%94'                       // percent-encoded UTF-8
    ];

    /** @param {string} dir @param {string[]} acc */
    const walk = (dir, acc) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.name.startsWith('.')) continue;
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (!SKIP_DIRS.has(entry.name)) walk(full, acc);
        } else if (EXTS.has(path.extname(entry.name).toLowerCase())) {
          if (full === __filename) continue;
          acc.push(full);
        }
      }
      return acc;
    };

    const offenders = [];
    for (const f of walk(ROOT, [])) {
      const content = fs.readFileSync(f, 'utf-8');
      for (const spelling of SPELLINGS) {
        let i = content.indexOf(spelling);
        if (i !== -1) {
          const line = content.slice(0, i).split('\n').length;
          offenders.push(
            `${path.relative(ROOT, f)}:${line} contains ${JSON.stringify(spelling)}`
          );
        }
      }
    }

    expect(offenders, `Em-dashes found:\n  ${offenders.join('\n  ')}`).toEqual([]);
  });

});
