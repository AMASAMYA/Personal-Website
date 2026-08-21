// @ts-check
//
// Colour contrast regression guard (WCAG 2.2 SC 1.4.3, Level AA).
//
// Why this exists: dark mode had 45 AA failures that nothing caught, because
// the site's contrast work had only ever been checked in light mode. Pages set
// light-theme colours in inline style attributes, which no [data-theme="dark"]
// rule can override, so headings and body copy stayed dark navy on dark navy.
// Two of them measured 1:1.
//
// This walks every rendered text node on every published page in BOTH themes
// and resolves the real backdrop: alpha compositing up the ancestor chain, and
// gradient stops evaluated individually against what sits behind them. Getting
// that wrong is what makes naive contrast checkers noisy, so the maths is here
// rather than in a dependency.

const { test, expect } = require('@playwright/test');

const PAGES = [
  '/', '/blog/', '/academy.html', '/apply.html', '/academy-author.html',
  '/amasamya-home.html', '/accessibility.html', '/checker.html',
  '/doc-checker.html', '/academy-admin.html', '/404.html',
  '/blog/wcag-22-changes.html', '/blog/gaad-2026-launching-amasamya.html'
];

function auditContrast() {
  const parse = c => {
    const m = c && c.match(/rgba?\(([^)]+)\)/); if (!m) return null;
    const q = m[1].split(',').map(x => parseFloat(x));
    return { r: q[0], g: q[1], b: q[2], a: q.length > 3 ? q[3] : 1 };
  };
  const lum = ({ r, g, b }) => {
    const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const ratio = (a, b) => {
    const L1 = lum(a), L2 = lum(b);
    return (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
  };
  const over = (f, bg) => ({
    r: f.a * f.r + (1 - f.a) * bg.r,
    g: f.a * f.g + (1 - f.a) * bg.g,
    b: f.a * f.b + (1 - f.a) * bg.b, a: 1
  });
  const stops = img => (img.match(/rgba?\([^)]+\)/g) || []).map(parse).filter(Boolean);

  // Candidate backdrop colours behind `n`, alpha-composited from the root down.
  // A gradient yields one candidate per stop; the worst is the one that counts.
  function resolve(n) {
    if (!n || n === document.documentElement) {
      const hb = parse(getComputedStyle(document.documentElement).backgroundColor);
      const bb = parse(getComputedStyle(document.body).backgroundColor);
      let base = { r: 255, g: 255, b: 255, a: 1 };
      if (hb && hb.a > 0) base = over(hb, base);
      if (bb && bb.a > 0) base = over(bb, base);
      return [base];
    }
    const cs = getComputedStyle(n);
    let behind = resolve(n.parentElement);
    const bc = parse(cs.backgroundColor);
    if (bc && bc.a > 0) behind = behind.map(x => over(bc, x));
    if (cs.backgroundImage && cs.backgroundImage !== 'none') {
      const st = stops(cs.backgroundImage);
      if (st.length) {
        const nx = [];
        behind.forEach(x => st.forEach(s => nx.push(over(s, x))));
        behind = nx;
      }
    }
    return behind.length > 8 ? behind.slice(0, 8) : behind;
  }

  const describe = el => {
    const p = []; let n = el;
    while (n && n !== document.body && p.length < 3) {
      let s = n.tagName.toLowerCase();
      if (n.id) s += '#' + n.id;
      else if (n.className && typeof n.className === 'string' && n.className.trim()) {
        s += '.' + n.className.trim().split(/\s+/)[0];
      }
      p.unshift(s); n = n.parentElement;
    }
    return p.join('>');
  };

  const failures = [];
  document.querySelectorAll('*').forEach(el => {
    const cs = getComputedStyle(el);
    const txt = [...el.childNodes].filter(x => x.nodeType === 3)
      .map(x => x.textContent.trim()).join(' ').trim();
    if (txt.length < 2) return;
    if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') return;

    // Anything inside a [hidden] or aria-hidden subtree is not exposed; the
    // accessibility settings dialog lives there until it is opened.
    let p = el, concealed = false;
    while (p && p !== document.documentElement) {
      if (p.hasAttribute && (p.hasAttribute('hidden') || p.getAttribute('aria-hidden') === 'true')) {
        concealed = true; break;
      }
      p = p.parentElement;
    }
    if (concealed) return;

    const rc = el.getBoundingClientRect();
    if (rc.width < 1 || rc.height < 1) return;

    // background-clip:text paints the gradient and leaves text-fill transparent.
    // Comparing `color` to itself would report a meaningless 1:1.
    const tf = parse(cs.webkitTextFillColor);
    if (tf && tf.a === 0) return;

    const fg = tf || parse(cs.color);
    if (!fg) return;

    const px = parseFloat(cs.fontSize);
    const large = px >= 24 || (parseInt(cs.fontWeight) >= 700 && px >= 18.66);
    const required = large ? 3 : 4.5;

    let worst = Infinity, worstBg = null;
    const cands = resolve(el);
    (cands && cands.length ? cands : [{ r: 255, g: 255, b: 255, a: 1 }]).forEach(b => {
      const f = fg.a < 1 ? over(fg, b) : fg;
      const r = ratio(f, b);
      if (r < worst) { worst = r; worstBg = b; }
    });
    if (!worstBg) return;

    const r = Math.round(worst * 100) / 100;
    if (r >= required) return;
    failures.push(
      `${r}:1 (needs ${required}:1) ${cs.color} on ` +
      `rgb(${Math.round(worstBg.r)},${Math.round(worstBg.g)},${Math.round(worstBg.b)}) ` +
      `@${px}px  ${describe(el)}  "${txt.slice(0, 40)}"`
    );
  });
  return failures;
}

for (const theme of ['light', 'dark']) {
  test.describe(`Colour contrast, ${theme} theme (WCAG 2.2 SC 1.4.3 AA)`, () => {
    for (const path of PAGES) {
      test(`${path} has no AA contrast failures in ${theme} mode`, async ({ browser }) => {
        const context = await browser.newContext();
        await context.addInitScript(t => {
          try { localStorage.setItem('theme', t); } catch (e) { /* storage blocked */ }
        }, theme);
        const page = await context.newPage();
        await page.goto('http://localhost:3000' + path, { waitUntil: 'networkidle' });
        const failures = await page.evaluate(auditContrast);
        await context.close();
        expect(failures, `${path} (${theme}):\n  ${failures.join('\n  ')}`).toEqual([]);
      });
    }
  });
}
