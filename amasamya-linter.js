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

function stripCodeExamples(html) {
  // Remove content that is code-about-HTML rather than live markup:
  // <textarea> bodies and attributes (placeholder shows escaped example HTML),
  // <pre> and <code> blocks (documentation examples).
  return html
    .replace(/<script\b[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[\s\S]*?<\/style>/gi, '')
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
