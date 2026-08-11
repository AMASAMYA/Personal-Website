/**
 * AMASAMYA Scheduled Crawl summary + webhook payload builders (v5.2)
 *
 * Pure functions extracted from background.js so they can be
 * unit-tested without a Chrome service worker context.
 *
 * summarizePage(currentFindings, previousFindings)
 *   Wraps AMASAMYAAuditDiff.diffAudits so the caller does not need
 *   to load the diff engine themselves. Returns per-page verdict
 *   counts.
 *
 * accumulateTotals(perPageResults, diffFn)
 *   Given an array of { findings, previousFindings } pairs and a
 *   diff function (dependency-injected so tests can stub), returns
 *   { pageCount, newFindings, regressedFindings, unchangedFindings,
 *     resolvedFindings }.
 *
 * buildWebhookPayload(schedule, summary)
 *   Returns the JSON body to POST for the schedule's webhookType.
 *   Slack, Teams, and generic-json shapes handled.
 */

(function (global) {
  'use strict';

  function accumulateTotals(perPageResults, diffFn) {
    var totals = { new: 0, regressed: 0, unchanged: 0, resolved: 0 };
    var pageCount = 0;
    if (!Array.isArray(perPageResults)) {
      return {
        pageCount: 0, newFindings: 0, regressedFindings: 0,
        unchangedFindings: 0, resolvedFindings: 0
      };
    }
    for (var i = 0; i < perPageResults.length; i++) {
      var r = perPageResults[i];
      if (!r || !Array.isArray(r.findings)) continue;
      pageCount++;
      var prev = Array.isArray(r.previousFindings) ? r.previousFindings : [];
      var res;
      try {
        res = diffFn(r.findings, prev);
      } catch (_e) {
        /* Diff failure for one URL falls back to counting current
           findings as all-new. Keeps the total meaningful. */
        totals.new += r.findings.length;
        continue;
      }
      if (res && res.summary) {
        totals.new       += (res.summary['new'] || 0);
        totals.regressed += (res.summary.regressed || 0);
        totals.unchanged += (res.summary.unchanged || 0);
        totals.resolved  += (res.summary.resolved || 0);
      }
    }
    return {
      pageCount: pageCount,
      newFindings:       totals.new,
      regressedFindings: totals.regressed,
      unchangedFindings: totals.unchanged,
      resolvedFindings:  totals.resolved
    };
  }

  function pickColor(summary) {
    if (summary.regressedFindings > 0) return '#c93636';
    if (summary.newFindings > 0)       return '#e0a800';
    return '#2b7bd0';
  }

  function diffLine(summary) {
    return summary.newFindings + ' new, ' +
           summary.regressedFindings + ' regressed, ' +
           summary.unchangedFindings + ' unchanged, ' +
           summary.resolvedFindings + ' resolved';
  }

  function buildWebhookPayload(schedule, summary) {
    var line = 'AMASAMYA scheduled crawl "' + schedule.label + '" completed: ' +
      summary.pageCount + ' pages audited. ' + diffLine(summary) + '.';
    var color = pickColor(summary);

    if (schedule.webhookType === 'slack') {
      return {
        text: line,
        attachments: [{
          color: color,
          fields: [
            { title: 'Schedule',   value: schedule.label,                  short: true },
            { title: 'Pages',      value: String(summary.pageCount),       short: true },
            { title: 'New',        value: String(summary.newFindings),        short: true },
            { title: 'Regressed',  value: String(summary.regressedFindings),  short: true },
            { title: 'Unchanged',  value: String(summary.unchangedFindings),  short: true },
            { title: 'Resolved',   value: String(summary.resolvedFindings),   short: true },
            { title: 'Started',    value: new Date(summary.startedAt).toISOString(),  short: true },
            { title: 'Finished',   value: new Date(summary.finishedAt).toISOString(), short: true }
          ]
        }]
      };
    }
    if (schedule.webhookType === 'teams') {
      return {
        '@type': 'MessageCard',
        '@context': 'http://schema.org/extensions',
        summary: line,
        themeColor: color.replace('#', ''),
        title: 'AMASAMYA scheduled crawl completed',
        text: line,
        sections: [{
          facts: [
            { name: 'Schedule',  value: schedule.label },
            { name: 'Pages',     value: String(summary.pageCount) },
            { name: 'New',       value: String(summary.newFindings) },
            { name: 'Regressed', value: String(summary.regressedFindings) },
            { name: 'Unchanged', value: String(summary.unchangedFindings) },
            { name: 'Resolved',  value: String(summary.resolvedFindings) },
            { name: 'Started',   value: new Date(summary.startedAt).toISOString() },
            { name: 'Finished',  value: new Date(summary.finishedAt).toISOString() }
          ]
        }]
      };
    }
    return {
      kind: 'amasamya.scheduled.run',
      version: '5.2',
      schedule: {
        id:    schedule.id,
        label: schedule.label,
        frequency: schedule.frequency,
        timeOfDayHHMM: schedule.timeOfDayHHMM
      },
      run: {
        startedAt:  summary.startedAt,
        finishedAt: summary.finishedAt,
        pageCount:  summary.pageCount,
        newFindings:       summary.newFindings,
        regressedFindings: summary.regressedFindings,
        unchangedFindings: summary.unchangedFindings,
        resolvedFindings:  summary.resolvedFindings
      }
    };
  }

  var api = {
    accumulateTotals:   accumulateTotals,
    buildWebhookPayload: buildWebhookPayload,
    diffLine:           diffLine
  };
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    global.AMASAMYAScheduledSummary = api;
  }
})(typeof self !== 'undefined' ? self : (typeof window !== 'undefined' ? window : globalThis));
