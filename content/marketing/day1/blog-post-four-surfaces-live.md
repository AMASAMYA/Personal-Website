BLOG POST FOR DAY 1


PUBLISHING CHECKLIST

1. Review the blog body below. Edit anything that sounds off.
2. When ready, save the body of the post (everything below the line that reads "BLOG POST BODY BEGINS", and above the line that reads "BLOG POST BODY ENDS") to the file content/blog/amasamya-four-surfaces-live.md in the repo.
3. Run these commands to publish: git add content/blog/amasamya-four-surfaces-live.md, then git commit with a message such as "blog: AMASAMYA is live on four surfaces", then git push.
4. Netlify will auto-deploy within a few minutes.
5. Once live, share the blog URL in the LinkedIn comment thread and in the Twitter thread.

Suggested slug is amasamya-four-surfaces-live.
Suggested title is: What I built when I could not find an audit tool that worked for me.


BLOG POST BODY BEGINS

Title: What I built when I could not find an audit tool that worked for me

I am blind. I use NVDA and JAWS on Windows and TalkBack on Android. For most of my career I have used other people's accessibility audit tools, and for most of that time I have had the same experience: the tool audits web pages for accessibility, and the tool itself is not accessible. The findings table cannot be navigated by keyboard. The sort controls have no aria-sort. The export dialog traps focus in a way that only mouse users can escape. The irony of an inaccessible accessibility auditor stopped being funny about six years ago.

Last year I finally decided to build the one I wanted. This week it went live on four surfaces.


Section: Where AMASAMYA is available now

Chrome Web Store: https://chromewebstore.google.com/detail/blnfmiipkccpggpinjofhhglfcgglbif

Microsoft Edge Add-ons: https://microsoftedge.microsoft.com/addons/detail/amasamya-accessibility-/enpnjjkakecacidhckphimkmhobjcblj

Firefox Add-ons: https://addons.mozilla.org/en-US/firefox/addon/amasamya-accessibility-audit/

Google Play: https://play.google.com/store/apps/details?id=org.amasamya.accessibility

All four are free.


Section: What it audits

The three browser extensions run WCAG 2.2 conformance audits, per-page and site-wide (crawl your own domain). They also run two India-national engines that no other auditor I know of currently ships. The first is GIGW 3.0, the accessibility guidelines that Indian government websites are supposed to conform to, published by NIC and MeitY. The second is IS 17802 Part 1:2021, the Bureau of Indian Standards accessibility standard for ICT products.

If your product serves the Indian public sector, or if you are building for the government e-marketplace, GIGW compliance is not optional. The Indian government accessibility standards deserve tooling that matches the WCAG side of the world, and until AMASAMYA there was no non-manual way to check GIGW conformance at scale.

The Android app is different. It uses Android's AccessibilityService API to audit native Android apps at runtime. It shows you live TalkBack captions as you interact, draws colour-coded touch-target boundaries, visualises focus trails, detects focus traps, scans for contrast drift, generates one-click fix suggestions, and includes a TalkBack simulator mode so sighted testers can experience what a blind user hears.


Section: What is on the platform, not just the extensions

Beyond the audit itself, AMASAMYA ships four features worth calling out.

First, VPAT 2.4 ACR one-click export. If you have ever spent a week hand-filling a VPAT template for a procurement conversation, this alone might justify the install.

Second, visual audit diffs. Two audits, side by side, marked with New, Regressed, Unchanged, Resolved. Answers "did we fix the thing we said we fixed last sprint" without eyeballing 400 rows.

Third, scheduled crawls. Set a schedule per URL or sitemap. The alarm fires the audit. Results post to Slack, Teams, or a generic webhook.

Fourth, audit history. Ten audits per URL cached locally. Load any older audit and diff against the current one.


Section: What is genuinely different

Every accessibility audit tool markets itself as accessible. Most are not. This one is built by a blind screen-reader user who cannot ship a broken keyboard flow, because he cannot use his own product if he does.

Three specific things I have obsessed over that most tools do not:

First, every finding row's screen-reader announcement includes which component failed, not just the finding text. When you arrow through rows in NVDA table mode, you hear the affected element (a CSS selector or a semantic path) as part of the row. No more "expand this row to find out what broke".

Second, every disclosure widget I built for the results view has an ARIA fix that took v5.3.1 to get right. The per-row detail region used to add a landmark to the JAWS rotor for every expanded row. Ten expanded findings on the extension side panel was ten new landmarks. The v5.3.1 patch changed role region to role group on that per-row detail, and the landmark rotor is clean again.

Third, the accessible PDF export path added in v5.3.2 opens a print-ready report in a new tab and auto-triggers window print. You pick Save as PDF as the destination in the browser dialog. Chrome and Edge emit a tagged PDF with reading order and heading structure preserved. No third-party PDF library. The developer at the other end can open the PDF with any reader and it is announced as a proper document, not a raster image.


Section: What I want from you

Install one of the four surfaces on a page you audit every week. Not a demo page. Not a WCAG example page. Something you actually work on in production. Run an audit. Send me what breaks.

I mean that literally. The next version of AMASAMYA is written by the bugs you send me. The email address is akhilesh@amasamya.com. If a keyboard flow is awkward, it is a bug. If a screen-reader announcement is missing, it is a bug. If the results table is confusing to navigate, it is a bug. Send me the URL, the page state, and the screen reader / browser combination, and I will look.


Section: What is coming next

The two-pillar plan for AMASAMYA is the Accessibility Audit Suite (what you can install today) and the AMASAMYA Academy (blind-and-partial-vision-friendly accessibility training and certification), which is scaffolded and paused on partner availability. Both live at https://amasamya.com.

If your team runs WCAG audits, GIGW audits, VPAT reporting, or accessibility QA on a release cadence, install the extensions. If your team ships an Android app that non-visual users need to reach, install the Android app. If you are a hiring manager for accessibility roles and you want to see what shipping accessibility-first looks like, install both and read the code. The Chrome extension source is public at github.com/AMASAMYA/AMASAMYA under an MIT licence.

Akhilesh Malani
10 September 2026

BLOG POST BODY ENDS
