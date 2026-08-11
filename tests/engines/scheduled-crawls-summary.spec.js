/**
 * AMASAMYA v5.2 Scheduled Crawls: summary accumulation and webhook
 * payload builders. Pure functions; no chrome API, no service worker.
 *
 * These tests are the automated confidence that the diff totals in
 * every scheduled-run record and every webhook payload are correct.
 * They stand in for the manual "load extension, wait for alarm" loop.
 */
const { test, expect } = require('@playwright/test');
const path = require('path');

const D = require(path.resolve(__dirname, '..', '..', 'amasamya-extension', 'engines', 'audit-diff.js'));
const S = require(path.resolve(__dirname, '..', '..', 'amasamya-extension', 'engines', 'scheduled-summary.js'));

function f(engine, criterion, selector, verdict) {
  return {
    engine: engine, criterion: criterion, selector: selector,
    element: selector, verdict: verdict || 'Fail', severity: 'Critical',
    id: `${engine}|${criterion}|${selector}|${verdict}`.replace(/\s/g, ''),
    issue: 'x', computed: '', required: '', howToFix: ''
  };
}

test.describe('Scheduled Crawls: summary accumulation', () => {

  test('exports the expected API surface', () => {
    ['accumulateTotals', 'buildWebhookPayload', 'diffLine'].forEach((k) => {
      expect(S[k]).toBeDefined();
    });
  });

  test('all-new: no prior baseline for any URL sums all findings as "new"', () => {
    const pages = [
      { url: 'https://a.example/', findings: [f('E','1.1.1','.a','Fail'), f('E','1.1.1','.b','Fail')], previousFindings: [] },
      { url: 'https://b.example/', findings: [f('E','1.1.1','.c','Fail')], previousFindings: [] }
    ];
    const summary = S.accumulateTotals(pages, D.diffAudits);
    expect(summary).toEqual({
      pageCount: 2, newFindings: 3, regressedFindings: 0, unchangedFindings: 0, resolvedFindings: 0
    });
  });

  test('all-unchanged: identical baselines produce 0 new / 0 regressed / N unchanged', () => {
    const rows = [f('E','1.1.1','.a','Fail'), f('E','1.1.1','.b','Fail')];
    const pages = [
      { url: 'https://a/', findings: rows, previousFindings: rows.slice() }
    ];
    const summary = S.accumulateTotals(pages, D.diffAudits);
    expect(summary.pageCount).toBe(1);
    expect(summary.newFindings).toBe(0);
    expect(summary.regressedFindings).toBe(0);
    expect(summary.unchangedFindings).toBe(2);
    expect(summary.resolvedFindings).toBe(0);
  });

  test('mixed: regression + new + resolved across two pages sums correctly', () => {
    /* Page 1: one row regressed (Pass -> Fail), one new. */
    const p1_prev = [f('E','1.1.1','.a','Pass')];
    const p1_curr = [f('E','1.1.1','.a','Fail'), f('E','1.1.1','.b','Fail')];
    /* Page 2: one row resolved (was Fail, now gone). */
    const p2_prev = [f('E','1.1.1','.c','Fail')];
    const p2_curr = [];
    const pages = [
      { url: 'https://p1/', findings: p1_curr, previousFindings: p1_prev },
      { url: 'https://p2/', findings: p2_curr, previousFindings: p2_prev }
    ];
    const summary = S.accumulateTotals(pages, D.diffAudits);
    /* NOTE: page 2 has findings=[] which is still an array, so it counts as a page. */
    expect(summary.pageCount).toBe(2);
    expect(summary.newFindings).toBe(1);        // .b on page 1
    expect(summary.regressedFindings).toBe(1);  // .a on page 1
    expect(summary.resolvedFindings).toBe(1);   // .c on page 2
  });

  test('skips pages with no findings array (e.g. auth-wall or timeout)', () => {
    const pages = [
      { url: 'https://ok/', findings: [f('E','1.1.1','.a','Fail')], previousFindings: [] },
      { url: 'https://auth/', /* no findings */ previousFindings: [] },
      null
    ];
    const summary = S.accumulateTotals(pages, D.diffAudits);
    expect(summary.pageCount).toBe(1);
    expect(summary.newFindings).toBe(1);
  });

  test('diff failure on one page falls back to counting all-new', () => {
    const throwingDiff = () => { throw new Error('boom'); };
    const pages = [
      { url: 'https://x/', findings: [f('E','1.1.1','.a','Fail'), f('E','1.1.1','.b','Fail')], previousFindings: [] }
    ];
    const summary = S.accumulateTotals(pages, throwingDiff);
    expect(summary.newFindings).toBe(2);
  });

  test('empty input returns zeroed summary', () => {
    expect(S.accumulateTotals([], D.diffAudits)).toEqual({
      pageCount: 0, newFindings: 0, regressedFindings: 0, unchangedFindings: 0, resolvedFindings: 0
    });
    expect(S.accumulateTotals(null, D.diffAudits)).toEqual({
      pageCount: 0, newFindings: 0, regressedFindings: 0, unchangedFindings: 0, resolvedFindings: 0
    });
  });

});

test.describe('Scheduled Crawls: webhook payload builder', () => {

  const schedule = {
    id: 's1', label: 'nightly check', frequency: 'daily',
    timeOfDayHHMM: '09:00', webhookType: 'slack', webhookUrl: 'https://hooks.slack.com/x'
  };
  const summary = {
    scheduleId: 's1', scheduleLabel: 'nightly check',
    startedAt: 1720000000000, finishedAt: 1720000123456,
    pageCount: 5, newFindings: 3, regressedFindings: 1, unchangedFindings: 12, resolvedFindings: 2
  };

  test('slack payload has text and attachment with all six verdict fields', () => {
    const p = S.buildWebhookPayload(Object.assign({}, schedule, { webhookType: 'slack' }), summary);
    expect(p.text).toContain('nightly check');
    expect(p.text).toContain('3 new, 1 regressed, 12 unchanged, 2 resolved');
    expect(p.attachments).toHaveLength(1);
    const fieldTitles = p.attachments[0].fields.map(f => f.title);
    ['Schedule','Pages','New','Regressed','Unchanged','Resolved','Started','Finished'].forEach(t => {
      expect(fieldTitles).toContain(t);
    });
  });

  test('slack colour is red when regressed > 0', () => {
    const p = S.buildWebhookPayload(Object.assign({}, schedule, { webhookType: 'slack' }), summary);
    expect(p.attachments[0].color).toBe('#c93636');
  });

  test('slack colour is amber when only new > 0', () => {
    const s = Object.assign({}, summary, { regressedFindings: 0 });
    const p = S.buildWebhookPayload(Object.assign({}, schedule, { webhookType: 'slack' }), s);
    expect(p.attachments[0].color).toBe('#e0a800');
  });

  test('slack colour is blue when clean run', () => {
    const s = Object.assign({}, summary, { newFindings: 0, regressedFindings: 0 });
    const p = S.buildWebhookPayload(Object.assign({}, schedule, { webhookType: 'slack' }), s);
    expect(p.attachments[0].color).toBe('#2b7bd0');
  });

  test('teams payload is a MessageCard with facts for each verdict', () => {
    const p = S.buildWebhookPayload(Object.assign({}, schedule, { webhookType: 'teams' }), summary);
    expect(p['@type']).toBe('MessageCard');
    expect(p['@context']).toBe('http://schema.org/extensions');
    const factNames = p.sections[0].facts.map(f => f.name);
    ['Schedule','Pages','New','Regressed','Unchanged','Resolved','Started','Finished'].forEach(n => {
      expect(factNames).toContain(n);
    });
  });

  test('generic-json payload carries the raw counts', () => {
    const p = S.buildWebhookPayload(Object.assign({}, schedule, { webhookType: 'generic-json' }), summary);
    expect(p.kind).toBe('amasamya.scheduled.run');
    expect(p.version).toBe('5.2');
    expect(p.run.pageCount).toBe(5);
    expect(p.run.newFindings).toBe(3);
    expect(p.run.regressedFindings).toBe(1);
    expect(p.run.unchangedFindings).toBe(12);
    expect(p.run.resolvedFindings).toBe(2);
    expect(p.schedule.label).toBe('nightly check');
  });

});

test.describe('Scheduled Crawls: missed-run detection', () => {

  /* All times are local. Tests construct concrete Date objects so
     the machine's timezone does not change the outcome. */

  test('lastExpectedFire (daily) is today at HH:MM when now is later', () => {
    const now = new Date(2026, 6, 20, 14, 0, 0);            // Mon 20 Jul 2026 14:00 local
    const s = { frequency: 'daily', timeOfDayHHMM: '09:00' };
    const expected = new Date(2026, 6, 20, 9, 0, 0).getTime();
    expect(S.lastExpectedFire(s, now)).toBe(expected);
  });

  test('lastExpectedFire (daily) is yesterday at HH:MM when now is earlier', () => {
    const now = new Date(2026, 6, 20, 8, 0, 0);             // Mon 20 Jul 2026 08:00 local
    const s = { frequency: 'daily', timeOfDayHHMM: '09:00' };
    const expected = new Date(2026, 6, 19, 9, 0, 0).getTime();
    expect(S.lastExpectedFire(s, now)).toBe(expected);
  });

  test('lastExpectedFire (weekly-monday) picks the most recent Monday', () => {
    const now = new Date(2026, 6, 23, 12, 0, 0);            // Thu 23 Jul 2026 12:00 local
    const s = { frequency: 'weekly-monday', timeOfDayHHMM: '09:00' };
    const expected = new Date(2026, 6, 20, 9, 0, 0).getTime(); // Mon 20 Jul
    expect(S.lastExpectedFire(s, now)).toBe(expected);
  });

  test('lastExpectedFire (weekly-friday) rolls back a week when today is Friday but HH:MM has not landed', () => {
    const now = new Date(2026, 6, 24, 7, 0, 0);             // Fri 24 Jul 2026 07:00 local
    const s = { frequency: 'weekly-friday', timeOfDayHHMM: '09:00' };
    const expected = new Date(2026, 6, 17, 9, 0, 0).getTime(); // Fri 17 Jul (previous week)
    expect(S.lastExpectedFire(s, now)).toBe(expected);
  });

  test('lastExpectedFire returns 0 for malformed schedule', () => {
    expect(S.lastExpectedFire(null, Date.now())).toBe(0);
    expect(S.lastExpectedFire({}, Date.now())).toBe(0);
    expect(S.lastExpectedFire({ frequency: 'daily' }, Date.now())).toBe(0);
    expect(S.lastExpectedFire({ frequency: 'daily', timeOfDayHHMM: 'xx' }, Date.now())).toBe(0);
    expect(S.lastExpectedFire({ frequency: 'monthly', timeOfDayHHMM: '09:00' }, Date.now())).toBe(0);
  });

  test('isMissed: enabled schedule that has never run is missed', () => {
    const now = new Date(2026, 6, 20, 14, 0, 0);
    const s = { enabled: true, frequency: 'daily', timeOfDayHHMM: '09:00', lastRunAt: null };
    expect(S.isMissed(s, now)).toBe(true);
  });

  test('isMissed: disabled schedule is never missed', () => {
    const now = new Date(2026, 6, 20, 14, 0, 0);
    const s = { enabled: false, frequency: 'daily', timeOfDayHHMM: '09:00', lastRunAt: null };
    expect(S.isMissed(s, now)).toBe(false);
  });

  test('isMissed: lastRunAt equals last expected fire => not missed', () => {
    const now = new Date(2026, 6, 20, 14, 0, 0);
    const s = {
      enabled: true, frequency: 'daily', timeOfDayHHMM: '09:00',
      lastRunAt: new Date(2026, 6, 20, 9, 0, 0).getTime()
    };
    expect(S.isMissed(s, now)).toBe(false);
  });

  test('isMissed: lastRunAt is earlier than last expected fire => missed', () => {
    const now = new Date(2026, 6, 20, 14, 0, 0);
    const s = {
      enabled: true, frequency: 'daily', timeOfDayHHMM: '09:00',
      lastRunAt: new Date(2026, 6, 19, 9, 0, 0).getTime()  // yesterday
    };
    expect(S.isMissed(s, now)).toBe(true);
  });

  test('isMissed: weekly-monday last run 8 days ago is missed', () => {
    const now = new Date(2026, 6, 20, 14, 0, 0);            // Mon 20 Jul
    const s = {
      enabled: true, frequency: 'weekly-monday', timeOfDayHHMM: '09:00',
      lastRunAt: new Date(2026, 6, 12, 9, 0, 0).getTime()   // Sun 12 Jul (before last Mon)
    };
    expect(S.isMissed(s, now)).toBe(true);
  });

});
