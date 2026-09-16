EMAIL TO LINKEDIN ACCESSIBILITY TEAM
IDENTITY VERIFICATION SELFIE STEP INACCESSIBLE FOR BLIND USERS


PUBLISHING CHECKLIST

1. Open your Gmail composer or email client.
2. Address the email to accessibility at linkedin dot com. Actual address: accessibility@linkedin.com
3. Set the CC to yourself (akhilesh at amasamya dot com) so you have a copy in the sent thread on both accounts.
4. Paste the subject line from below into the Subject field.
5. Paste the email body from below into the message body. Fill in the two placeholders marked in square brackets before you send: your exact city, and the specific browser plus version you used for the attempts. If you cannot remember the browser version, remove that word and just name the browser.
6. Send.
7. Expect a first response in 3 to 7 business days. If nothing arrives in 10 business days, forward the same email as a nudge with the words "second request, still awaiting reply" at the top.


SUBJECT LINE, PASTE INTO THE SUBJECT FIELD

Blind user unable to complete identity verification: selfie liveness step is inaccessible


EMAIL BODY BEGINS

Hi LinkedIn Accessibility team,

I am Akhilesh Malani, a blind accessibility architect based in India. I have been trying to complete LinkedIn's government-ID identity verification for the past several days and cannot get past the selfie liveness capture step. This email is both a bug report and a request for an accessible alternative.

My account: https://www.linkedin.com/in/akhilesh-malani/

What is failing

Government ID upload completes successfully.

The next step is a live selfie capture with a liveness check (face framing, hold still, and in some flows a head-turn or blink prompt).

The capture fails on every attempt, whether I try alone or with sighted assistance.

What I tried

Multiple attempts on my own using [FILL IN BROWSER, e.g. Chrome 128] with NVDA on Windows.

Multiple attempts with sighted assistance where the assistant held the device and followed the visual prompts on my behalf.

Different lighting conditions and two different cameras.

Why sighted assistance does not solve this

The framing prompts (move closer, move away, centre your face, hold still) are visual-only. My assistant can follow them for the framing part, but the liveness gestures require me to blink or turn my head at the exact right moment relative to when the prompt appears on screen. There is no audio cue that reliably tells me when to blink or turn. My assistant cannot cue me in time either, because the on-screen prompt does not have a spoken equivalent for them to relay.

The pass or fail feedback at the end of the capture does not reach my screen reader with enough clarity to know why the attempt failed. When the capture fails, the failure reason is either unstated or presented too briefly to consume via screen reader before the next attempt begins.

Impact

This is not unique to me. The selfie liveness pattern used by identity-vendor SDKs is a known accessibility gap for blind and low-vision users industry-wide. The practical result is that a real subset of LinkedIn's professional user base is functionally locked out of the identity verification programme. From a WCAG 2.2 perspective this touches at minimum:

1.3.3 Sensory Characteristics (Level A)
3.3.1 Error Identification (Level A)
4.1.3 Status Messages (Level AA)

What I need

Either an accessible alternative to the selfie step. Workplace verification via a Virtusa work email, Microsoft Entra Verified ID, or a manual review path with a human agent would all work. Any of these gives me the verified badge without a camera-based liveness check.

Or a fix to the current selfie capture flow: an audible liveness cue that tells me when to blink or turn, a screen-reader-friendly framing feedback stream, and a persistent (not-auto-dismissed) failure-reason message at the end of a failed attempt.

What I can offer

I have shipped an accessibility audit tool that runs across four surfaces: Chrome, Microsoft Edge, Firefox as browser extensions, and Google Play as an Android app that audits other Android apps via the AccessibilityService API. AMASAMYA is live at https://amasamya.com.

I am happy to help your team audit the identity verification flow with a screen reader on file if that would speed triage. If you run a beta or accessibility-review path for the identity verification programme, please add me to it.

Prior context

I have raised this via LinkedIn Help Center twice without a substantive reply. I am escalating to your team because I would like this treated as an accessibility issue rather than a routine support ticket.

Contact

LinkedIn: https://www.linkedin.com/in/akhilesh-malani/
Email: akhilesh.malani at gmail dot com (personal), or akhilesh at amasamya dot com (product)
Location: [FILL IN YOUR EXACT CITY], India

Thanks for looking at this.

Akhilesh Malani
Blind accessibility architect
Founder, AMASAMYA
Accessibility Architect at Virtusa

EMAIL BODY ENDS


TWO PLACEHOLDERS TO FILL BEFORE SENDING

Look for FILL IN BROWSER in the "What I tried" section. Replace with the browser and version you used for the attempts. If you cannot remember the version, remove the word and just say the browser name.

Look for FILL IN YOUR EXACT CITY in the Contact section. Replace with your city (Chennai per your current profile, unless you have moved).


WHAT TO EXPECT

Response time from accessibility@linkedin.com is typically 3 to 7 business days for a first reply, 2 to 4 weeks for anything actionable. They usually acknowledge and route to the relevant product team. Do not expect an immediate fix; do expect at least an acknowledgement of the accessibility issue.

If they suggest you try the same failing flow again, reply with a firm restatement that the flow is fundamentally inaccessible and that you need one of the alternative verification paths (workplace email, Entra Verified ID, or manual human review), not a retry of the failing selfie step.


FOLLOW-UP OPTIONS IF NO REPLY IN 10 BUSINESS DAYS

Nudge email: forward the original email back to accessibility@linkedin.com with the words "second request, still awaiting reply" at the top. Add nothing else.

Public post: quote the accessibility issue in a LinkedIn post tagging LinkedIn Help and LinkedIn Accessibility (if their handle exists). Public tag on a11y-related failures on major platforms tends to reach the triage team faster than tickets. Time this at least a week after your product launch so the two do not compete for your reply capacity.

Regulatory route: India's Rights of Persons with Disabilities Act 2016 has provisions on digital accessibility of essential platforms. Escalation to the Chief Commissioner for Persons with Disabilities is available but is a heavy-weight move; save for after all other paths have failed.
