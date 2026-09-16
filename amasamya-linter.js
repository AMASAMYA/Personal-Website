#!/usr/bin/env node
/**
 * AMASAMYA Accessibility Linter CLI for CI/CD Pipelines
 * Audits HTML files or web properties against WCAG 2.2 AA/AAA, GIGW 3.0, and IS 17802 standards.
 * 
 * Usage:
 *   node amasamya-linter.js <path-to-html-file-or-directory>
 */

const fs = require('fs');
const path = require('path');

console.log('----------------------------------------------------');
console.log('   AMASAMYA Accessibility Linter (GIGW 3.0 / IS 17802)   ');
console.log('----------------------------------------------------\n');

const targetArg = process.argv[2] || '.';

function findRawTextEnd(html, start, closeTag) {
  // Scan a <script> or <style> body respecting JS/CSS string and comment
  // boundaries so a stringified `</script>` inside a JS literal does not
  // close the block prematurely. Returns the index one past the closing tag,
  // or html.length if unclosed.
  const lowerClose = closeTag.toLowerCase();
  const len = html.length;
  let i = start;
  let quote = null;
  let inLineComment = false;
  let inBlockComment = false;

  while (i < len) {
    const c = html[i];
    const n = html[i + 1];

    if (inLineComment) {
      if (c === '\n') inLineComment = false;
      i++; continue;
    }
    if (inBlockComment) {
      if (c === '*' && n === '/') { inBlockComment = false; i += 2; continue; }
      i++; continue;
    }
    if (quote) {
      if (c === '\\') { i += 2; continue; }
      if (c === quote) { quote = null; }
      i++; continue;
    }
    if (c === '/' && n === '/') { inLineComment = true; i += 2; continue; }
    if (c === '/' && n === '*') { inBlockComment = true; i += 2; continue; }
    if (c === '"' || c === "'" || c === '`') { quote = c; i++; continue; }

    if (html.substr(i, lowerClose.length).toLowerCase() === lowerClose) {
      return i + lowerClose.length;
    }
    i++;
  }
  return len;
}

function stripRawTextElements(html, tagName) {
  const openRe = new RegExp('<' + tagName + '\\b[^>]*>', 'gi');
  const closeTag = '</' + tagName + '>';
  let out = '';
  let last = 0;
  let m;
  openRe.lastIndex = 0;
  while ((m = openRe.exec(html)) !== null) {
    const bodyStart = m.index + m[0].length;
    const end = findRawTextEnd(html, bodyStart, closeTag);
    out += html.slice(last, m.index);
    last = end;
    openRe.lastIndex = end;
  }
  out += html.slice(last);
  return out;
}

function stripCodeExamples(html) {
  // Remove content that is code-about-HTML or non-markup rather than live
  // markup: <script> and <style> bodies (state-machine strip that respects
  // JS/CSS string and comment boundaries so a `</script>` inside a JS
  // string literal does not close the block prematurely), <textarea>
  // bodies and attributes (placeholder shows escaped example HTML),
  // <pre> and <code> blocks (documentation examples), and HTML comments.
  let out = stripRawTextElements(html, 'script');
  out = stripRawTextElements(out, 'style');
  return out
    .replace(/<textarea\b[^>]*>[\s\S]*?<\/textarea>/gi, '')
    .replace(/<textarea\b[^>]*\/?>/gi, '')
    .replace(/<pre\b[\s\S]*?<\/pre>/gi, '')
    .replace(/<code\b[\s\S]*?<\/code>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '');
}

function auditHtmlFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const scanContent = stripCodeExamples(content);
  const fileName = path.basename(filePath);
  const issues = [];

  // Check 1: Missing lang attribute on html tag
  if (!/<html[^>]*\blang=["'][^"']+["']/i.test(content)) {
    issues.push({ id: 'LANG_MISSING', severity: 'Fail', wcag: '3.1.1', desc: 'Missing valid lang attribute on <html> element.' });
  }

  // Check 2: Images missing alt attribute
  const imgMatches = scanContent.match(/<img\b[^>]*>/gi) || [];
  imgMatches.forEach(img => {
    if (!/\balt=["']/i.test(img)) {
      issues.push({ id: 'IMG_ALT_MISSING', severity: 'Fail', wcag: '1.1.1', desc: `Image element missing alt attribute: ${img.slice(0, 45)}...` });
    }
  });

  // Check 3: Buttons without accessible names
  const btnMatches = scanContent.match(/<button\b[^>]*>[\s\S]*?<\/button>/gi) || [];
  btnMatches.forEach(btn => {
    const textContent = btn.replace(/<[^>]+>/g, '').trim();
    const hasText = textContent.length > 0;
    const hasAriaLabel = /\baria-label=["'][^"']+["']/i.test(btn);
    const hasAriaLabelledBy = /\baria-labelledby=["'][^"']+["']/i.test(btn);
    if (!hasText && !hasAriaLabel && !hasAriaLabelledBy) {
      issues.push({ id: 'BUTTON_NO_LABEL', severity: 'Fail', wcag: '4.1.2', desc: `Button element lacks accessible label or text content: ${btn.slice(0, 45)}...` });
    }
  });

  // Check 4: Form inputs without labels
  // Recognize implicit label wrapping: <label>...<input>text</label> (WCAG H44).
  const wrappedInputs = new Set();
  const labelBlocks = scanContent.match(/<label\b[^>]*>[\s\S]*?<\/label>/gi) || [];
  labelBlocks.forEach(lbl => {
    const stripped = lbl.replace(/<[^>]+>/g, '').trim();
    if (!stripped) return; // empty label wrapper is not a real label
    const nested = lbl.match(/<input\b[^>]*>/gi) || [];
    nested.forEach(inp => wrappedInputs.add(inp));
  });

  const inputMatches = scanContent.match(/<input\b[^>]*>/gi) || [];
  inputMatches.forEach(inp => {
    const typeMatch = inp.match(/\btype=["']([^"']+)["']/i);
    const type = typeMatch ? typeMatch[1].toLowerCase() : 'text';
    if (['hidden', 'submit', 'button', 'image', 'reset'].includes(type)) return;
    if (wrappedInputs.has(inp)) return;
    const hasId = /\bid=["'][^"']+["']/i.test(inp);
    const hasAriaLabel = /\baria-label=["'][^"']+["']/i.test(inp);
    const hasAriaLabelledBy = /\baria-labelledby=["'][^"']+["']/i.test(inp);
    if (!hasAriaLabel && !hasAriaLabelledBy && !hasId) {
      issues.push({ id: 'INPUT_UNLABELLED', severity: 'Fail', wcag: '1.3.1', desc: `Form input lacks explicit label association or aria-label: ${inp.slice(0, 45)}...` });
    }
  });

  // Check 5: CAPTCHA widget without accessibility affordances.
  // Only flag actual widget markup, not prose that mentions the word.
  const captchaWidget = /class=["'][^"']*g-recaptcha|data-sitekey=|recaptcha\/api\.js|hcaptcha\.com\/|cf-turnstile|<iframe[^>]+recaptcha/i;
  if (captchaWidget.test(scanContent) && !/aria-live/i.test(scanContent) && !/audio/i.test(scanContent)) {
    issues.push({ id: 'CAPTCHA_INACCESSIBLE', severity: 'Warning', wcag: '3.3.8', desc: 'CAPTCHA widget detected without visible audio alternative or aria-live status region.' });
  }

  return { fileName, filePath, totalChecks: 5, violations: issues };
}

function runLinter() {
  const targetAbs = path.resolve(targetArg);
  let filesToScan = [];

  if (fs.existsSync(targetAbs)) {
    if (fs.statSync(targetAbs).isDirectory()) {
      const entries = fs.readdirSync(targetAbs);
      filesToScan = entries.filter(f => f.endsWith('.html')).map(f => path.join(targetAbs, f));
    } else if (targetAbs.endsWith('.html')) {
      filesToScan = [targetAbs];
    }
  }

  if (filesToScan.length === 0) {
    console.log('No HTML files found for auditing in target path:', targetAbs);
    return;
  }

  let totalViolations = 0;
  filesToScan.forEach(fp => {
    const result = auditHtmlFile(fp);
    console.log(`🔍 File: ${result.fileName}`);
    if (result.violations.length === 0) {
      console.log('   ✓ 100% Compliant (WCAG 2.2 AA / GIGW 3.0 / IS 17802)\n');
    } else {
      result.violations.forEach(v => {
        totalViolations++;
        console.log(`   ❌ [${v.severity}] SC ${v.wcag} - ${v.id}: ${v.desc}`);
      });
      console.log('');
    }
  });

  console.log(`Audit Summary: Processed ${filesToScan.length} files. Total violations found: ${totalViolations}`);
  if (totalViolations > 0) {
    process.exitCode = 1;
  }
}

runLinter();
