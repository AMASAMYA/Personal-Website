#!/usr/bin/env node
/*
 * Aggregate AMASAMYA JSON exports from one false-positive sweep into a
 * per-detector table. Writes a markdown table to stdout.
 *
 * Usage:
 *   node scripts/aggregate-false-positive-sweep.js \
 *     "Test Reports/false-positive-sweep/v5.4.1/*.json"
 *
 * The input JSON is whatever shape the extension's Export > JSON button
 * produces. The script does not assume a specific field name for the
 * detector id or the message; it tries a short list of candidates and
 * falls back to a nested-key search. If your export uses different
 * names, extend DETECTOR_KEYS and MESSAGE_KEYS at the top of this file.
 *
 * Thresholds for the triage report are documented in
 * amasamya-extension/FALSE-POSITIVE-SWEEP.md and are NOT applied here.
 * This script only counts; triage is a human spot-check step.
 */

const fs = require('fs');
const path = require('path');

const DETECTOR_KEYS = ['engine', 'detector', 'rule', 'ruleId', 'checkId'];
const MESSAGE_KEYS = ['message', 'description', 'summary', 'issue', 'text'];
const FINDINGS_KEYS = ['findings', 'issues', 'results', 'items'];

function pickFirstPresent(obj, keys) {
  if (!obj || typeof obj !== 'object') return undefined;
  for (const k of keys) {
    if (obj[k] != null && obj[k] !== '') return obj[k];
  }
  return undefined;
}

function extractFindings(root) {
  if (Array.isArray(root)) return root;
  const arr = pickFirstPresent(root, FINDINGS_KEYS);
  if (Array.isArray(arr)) return arr;
  // Last resort: find the first array of objects anywhere in the tree.
  const stack = [root];
  while (stack.length) {
    const node = stack.pop();
    if (!node || typeof node !== 'object') continue;
    for (const v of Object.values(node)) {
      if (Array.isArray(v) && v.length && typeof v[0] === 'object') return v;
      if (v && typeof v === 'object') stack.push(v);
    }
  }
  return [];
}

function readJsonFile(file) {
  const raw = fs.readFileSync(file, 'utf8');
  try {
    return JSON.parse(raw);
  } catch (e) {
    console.error('Could not parse ' + file + ': ' + e.message);
    return null;
  }
}

function expandGlob(arg) {
  // Minimal glob: supports a trailing *.json pattern in a directory.
  if (!arg.includes('*')) return [arg];
  const dir = path.dirname(arg);
  const pat = path.basename(arg);
  if (!fs.existsSync(dir)) return [];
  const re = new RegExp('^' + pat.replace(/\./g, '\\.').replace(/\*/g, '.*') + '$');
  return fs.readdirSync(dir).filter(n => re.test(n)).map(n => path.join(dir, n));
}

function main() {
  const args = process.argv.slice(2);
  if (!args.length) {
    console.error('usage: aggregate-false-positive-sweep.js <json-file-or-glob> [...]');
    process.exit(2);
  }
  const files = args.flatMap(expandGlob);
  if (!files.length) {
    console.error('No JSON files matched the given arguments.');
    process.exit(2);
  }

  // detector -> { total: n, messages: Map<message, count>, siteTotals: Map<site, n> }
  const per = new Map();
  const perSiteTotals = new Map();

  for (const file of files) {
    const root = readJsonFile(file);
    if (!root) continue;
    const site = path.basename(file).replace(/\.json$/i, '');
    const findings = extractFindings(root);
    perSiteTotals.set(site, findings.length);
    for (const f of findings) {
      const det = String(pickFirstPresent(f, DETECTOR_KEYS) || 'unknown');
      const msg = String(pickFirstPresent(f, MESSAGE_KEYS) || '(no message)');
      if (!per.has(det)) per.set(det, { total: 0, messages: new Map(), siteTotals: new Map() });
      const rec = per.get(det);
      rec.total += 1;
      rec.messages.set(msg, (rec.messages.get(msg) || 0) + 1);
      rec.siteTotals.set(site, (rec.siteTotals.get(site) || 0) + 1);
    }
  }

  // Sort detectors by total_findings desc, then by duplication_ratio desc.
  const rows = Array.from(per.entries()).map(([det, rec]) => {
    const unique = rec.messages.size;
    const ratio = unique === 0 ? 0 : rec.total / unique;
    return { det, total: rec.total, unique, ratio, siteTotals: rec.siteTotals };
  });
  rows.sort((a, b) => b.total - a.total || b.ratio - a.ratio);

  // Markdown output.
  const siteNames = Array.from(perSiteTotals.keys());
  console.log('# False-positive sweep aggregate');
  console.log('');
  console.log('Files included:');
  for (const f of files) console.log('- ' + f);
  console.log('');
  console.log('Per-site total findings:');
  for (const s of siteNames) console.log('- ' + s + ': ' + perSiteTotals.get(s));
  console.log('');
  console.log('Per-detector counts, sorted by total_findings desc:');
  console.log('');
  const header = ['detector', 'total_findings', 'unique_messages', 'duplication_ratio', ...siteNames];
  console.log('| ' + header.join(' | ') + ' |');
  console.log('|' + header.map(() => '---').join('|') + '|');
  for (const r of rows) {
    const perSite = siteNames.map(s => r.siteTotals.get(s) || 0);
    const cells = [r.det, r.total, r.unique, r.ratio.toFixed(1), ...perSite];
    console.log('| ' + cells.join(' | ') + ' |');
  }
  console.log('');
  console.log('Flags:');
  console.log('- duplication_ratio above 5: suspicious cluster, spot-check first.');
  console.log('- duplication_ratio above 20: almost always a false-positive cluster.');
  console.log('');
  console.log('Next: spot-check the top five detectors per the triage procedure in');
  console.log('amasamya-extension/FALSE-POSITIVE-SWEEP.md and write the fix-queue');
  console.log('markdown alongside this file.');
}

main();
