# The Stepper component: accessibility first, functionality second

Draft. Author: Akhilesh Malani. Not yet published.

## Why this needs a full write-up

The word "Stepper" gets used for two very different UI components, and they
share almost nothing except a name. Confusing them in a design conversation
is common. Confusing them in an implementation is a shipped bug.

**Component 1: the wizard stepper.** A progress indicator that breaks a long
task into ordered steps. Checkout flows, government-service applications,
onboarding, tax-return forms, income-tax portals, DigiLocker sign-up, PAN
card applications, insurance quotes. Anywhere the user has to fill several
screens in sequence.

**Component 2: the numeric stepper.** A small input that lets the user
increment or decrement a number using plus and minus controls. Cart quantity
selectors, ticket counts, guest counts on a hotel booking, dosage inputs on
a healthcare app, seat count on a restaurant reservation.

Everything below is organised accessibility first, functionality second,
across web and mobile. If a section says something is "the accessible way",
that is not opinion. It is derived from the ARIA Authoring Practices Guide,
platform accessibility APIs, and what NVDA, JAWS, VoiceOver, and TalkBack
actually announce when the pattern is implemented one way versus another.

---

## Part 1: the wizard stepper (progress stepper)

### What it is

A wizard stepper is a horizontal or vertical list of ordered steps rendered
above (or beside) a form. It shows three things at once: the total number of
steps, which step is currently active, and which steps are completed. The
user progresses through the form and the indicator updates.

### Why it exists

- **Cognitive-load reduction.** WCAG 3.3.4 Error Prevention encourages
  breaking long tasks into reviewable chunks. A single ten-field form is
  more likely to be abandoned than four screens of two or three fields.
- **Progress transparency.** The user always knows how much is left. Loss
  aversion drops when someone can see the finish line.
- **Recoverable errors.** Validation happens per step, so a mistake on step
  two does not force the user to re-scroll a ten-screen form to fix it.
- **Save-and-resume.** Long applications (visa, tax, insurance) need to
  persist between sessions. Steps map cleanly to save points.

### Types of wizard stepper

- **Horizontal stepper.** Steps laid out left-to-right (or right-to-left in
  RTL locales). Common on desktop widths.
- **Vertical stepper.** Steps stacked top-to-bottom. Common on mobile
  widths and on complex flows where each step has a short summary line
  underneath. Material Design ships both.
- **Linear stepper.** Steps must be completed in sequence. The user cannot
  jump ahead until the current step validates. Tax forms and identity
  verification live here.
- **Non-linear stepper.** Steps can be completed in any order. Useful when
  the form sections are independent (profile settings, preference
  wizards). Non-linear does not mean "no validation"; it means the order
  is not enforced.
- **Editable stepper.** Completed steps can be revisited and edited without
  losing later data. This is a functionality choice with strong
  accessibility implications: an editable stepper needs a clear
  "Edit step N" affordance, not just a link on the step number.

### Where a wizard stepper is applicable

Multi-step forms only. If the flow is one screen, do not add a stepper for
decoration. A stepper with one step is worse than no stepper because it
adds noise for every screen-reader user without giving them any progress
information they did not already have.

Rule of thumb: three or more sequential screens where each screen has its
own validation. Under three, a single form with clear section headings is
usually better.

### Accessibility implementation (web)

The ARIA Authoring Practices Guide does not have a formal "stepper"
pattern, but the correct combination of primitives is well-established.

**Structural markup:**

- Wrap the stepper in a `<nav>` landmark with an accessible name such as
  `aria-label="Application progress"`.
- Inside, use an `<ol>` (ordered list) with an `<li>` per step. The
  ordered-list semantics are what screen readers use to say
  "list with 5 items, item 2 of 5" as the user navigates.
- Each step is a link or a button depending on whether it is navigable.
  Linear steppers with locked future steps: use `<button disabled>` for
  future steps and links for completed ones. Non-linear steppers: links
  throughout.
- The current step must carry `aria-current="step"`. This is the single
  most important attribute in the whole pattern. Without it, no screen
  reader can announce which step the user is on. `aria-current="step"` is
  announced as "current step" or similar by NVDA, JAWS, and VoiceOver.

**Live progress announcement:**

- On step change, push a polite-region announcement such as
  "Step 3 of 5, Shipping address" into an `aria-live="polite"` region.
  This tells the SR user the transition happened without waiting for
  them to re-navigate to the stepper.
- Move keyboard focus to the first form field of the new step, or to the
  step heading (an `<h2>` with `tabindex="-1"`). Do not leave focus on
  the "Next" button, which is now off-screen or replaced.

**Progress semantics for the visual indicator:**

- If the stepper renders a coloured progress bar underneath, wrap it in
  `role="progressbar"` with `aria-valuenow`, `aria-valuemin="1"`,
  `aria-valuemax` set to total steps, and `aria-valuetext="Step 3 of 5"`
  so the SR user gets a meaningful value not just a percentage.

**Step labels:**

- Every step needs a descriptive label. "Step 1" is not a label. "Step 1:
  Contact details" is. The label is what SR users hear on both the
  stepper itself and in the step-change announcement.
- Numbers alone in the visual design (small circles with 1, 2, 3) must
  still carry the label as accessible text. Use visually-hidden text or
  `aria-label` on the link or button.

**Error handling:**

- When validation fails on a step, keep focus on the current step. Do not
  advance.
- Push an assertive-region announcement such as "3 errors in Contact
  details. Focus moved to first error."
- Move focus to the first invalid field. That field must have
  `aria-invalid="true"` and `aria-describedby` pointing to the visible
  error message.
- On the stepper itself, mark the failing step with `aria-invalid="true"`
  or a status like "with errors" in its accessible name.

### Accessibility implementation (mobile)

**iOS (UIKit and SwiftUI):**

- iOS does not have a built-in wizard-stepper control. Custom
  implementations should use a `UIStackView` (or SwiftUI equivalent) with
  each step as a `UIButton` or a tappable view exposing the button
  accessibility trait.
- The current step's accessibility label must include the word "current"
  so VoiceOver says "Current step, Shipping".
- Post `UIAccessibility.Notification.announcement` (or
  `AccessibilityNotification.announcement` in SwiftUI) on step transition
  so VoiceOver reads the change.
- Move VoiceOver focus with
  `UIAccessibility.Notification.screenChanged` and pass the first field
  or step heading as the argument.

**Android (Views and Jetpack Compose):**

- Compose ships `LinearProgressIndicator` for the bar, but no formal
  wizard stepper. Roll it as a `Row` (horizontal) or `Column` (vertical)
  of tappable `Box` or `Text` composables.
- Set `Modifier.semantics { role = Role.Button }` per step and
  `stateDescription = "Current step"` on the active one so TalkBack
  announces it correctly.
- Use `LiveRegionMode.Polite` on the step-change announcement view.
- Move accessibility focus on transition with
  `LocalFocusManager.current.moveFocus(FocusDirection.Enter)` combined
  with `Modifier.focusRequester(...).focusable()` on the new screen's
  heading.

### Common defects (seen in real audits)

- Steps are unlabeled `<div>` clicks. NVDA reads "clickable" and nothing
  else. The user cannot tell what step they are on or where they can go.
- No `aria-current`. The visual highlight is CSS only. Screen-reader
  users cannot tell which step is active.
- Focus is left on the "Next" button after transition. Screen-reader
  users hear silence, then a fresh page render, then have to hunt for
  where they landed.
- Non-linear stepper that silently blocks jumping past an incomplete
  step. The user activates step 4, nothing happens, no error is
  announced, they think the app is broken.
- Progress bar with `role="progressbar"` but no `aria-valuenow`.
  VoiceOver announces "progress indicator" with no value.
- Mobile: step buttons are 24 by 24 dp. WCAG 2.5.8 Target Size (Minimum)
  is 24 CSS pixels, WCAG 2.5.5 Enhanced is 44 CSS pixels. The visual
  design is at the AAA edge, one padding change away from failing AA.

---

## Part 2: the numeric stepper (spinbutton)

### What it is

A numeric stepper lets the user set a number by tapping or clicking a
plus button, a minus button, or typing directly into an input between
them. The value has a defined minimum, a defined maximum, and usually a
defined step size (1, 10, 0.5, whatever the domain calls for).

### Why it exists

- **Precision without a keyboard.** On touch devices, the plus and minus
  controls avoid the numeric-keyboard popup for small ranges.
- **Bound enforcement.** The user cannot enter a value outside the
  range because the buttons disable at bounds.
- **Discoverable step size.** The user learns quickly that each tap
  changes the value by a known amount.
- **Common in commerce and healthcare.** Cart quantity, ticket count,
  insulin dose, portion count.

### Where a numeric stepper is applicable

- The user must pick a number in a bounded range.
- The typical value is close to the minimum (0 or 1). Steppers are
  bad for open ranges like "enter your age" where the user might tap
  30 times to reach 30.
- The step size is a simple integer or a small fraction (never
  arbitrary).

If the value range is large or the user often types a specific number
(a phone-number field, a bank-transfer amount, an age), use a plain
numeric input instead. Steppers are for adjust, not for enter.

### Accessibility implementation (web)

Two paths, both correct depending on the interaction the design calls
for.

**Path A: native `<input type="number">` with visible +/- buttons.**

The best default. The browser provides increment and decrement, the
mobile keyboard is numeric, and the value has full input semantics for
free.

- The `<input type="number">` should have a `<label>` associated by
  `for`/`id`, not a placeholder-as-label.
- The plus and minus buttons need accessible names. Not "+" and "-",
  because screen readers may read those as "plus, button" and
  "hyphen, button" with no context. Use
  `aria-label="Increase quantity"` and
  `aria-label="Decrease quantity"` (localise per language).
- The buttons should update the input's value via JS and dispatch an
  `input` event so any framework listeners fire.
- At the min and max bounds, set `disabled` on the respective button.
  A disabled button is announced by screen readers as "dimmed" or
  "unavailable", which is the correct signal.
- Do not use `aria-live` on the input itself; the input value is
  already read on focus. However, if the buttons are on a separate row
  from the input and focus stays on the button, a polite-region
  announcement of the new value is helpful.

**Path B: fully custom `role="spinbutton"` widget.**

Necessary when the input is not a text field at all (Material Design's
stepper on mobile web, for example, hides the input).

- The whole widget carries `role="spinbutton"`, `aria-valuenow`,
  `aria-valuemin`, `aria-valuemax`, and `aria-valuetext` (for
  human-readable values like "2 kilograms" instead of just "2").
- Keyboard: Up and Down arrows increment and decrement by the step
  size. Page Up and Page Down move by ten steps (or a domain-defined
  larger jump). Home and End move to min and max.
- The spinbutton itself must be focusable (`tabindex="0"`).
- Screen readers announce the new `aria-valuenow` and `aria-valuetext`
  automatically on change. No manual live-region announcement needed
  if these attributes are updated correctly.

Reference: the ARIA Authoring Practices Guide spinbutton pattern at
w3.org/WAI/ARIA/apg/patterns/spinbutton is the canonical source for
Path B.

### Accessibility implementation (mobile)

**iOS UIStepper (UIKit) and Stepper (SwiftUI):**

- The native control exposes the "Adjustable" trait to VoiceOver. When
  the user focuses the stepper, VoiceOver says "Adjustable" and the
  user swipes up or down with one finger to change the value.
- The single focus stop for the whole widget is intentional. Do not
  split the widget into two separately focusable buttons; that breaks
  the Adjustable pattern.
- Set `accessibilityLabel` to describe what the value represents:
  "Quantity", not just "Stepper".
- Set `accessibilityValue` to include units where relevant: "2
  kilograms", not just "2".

**Android (Views and Jetpack Compose):**

- Compose does not ship a stepper composable. Roll it as a `Row` of
  IconButton + Text + IconButton and merge the semantics.
- On the parent `Modifier.semantics(mergeDescendants = true)`, set
  `contentDescription = "Quantity, 2 kilograms"` and register
  `SemanticsActions.SetProgress` (or custom `Increment` and `Decrement`
  actions) so TalkBack can adjust the value through swipe gestures
  like on iOS.
- Alternative for simple cases: use a `Slider` in stepper mode
  (discrete values with a step count). Slider ships accessible by
  default.

### Common defects (seen in real audits)

- Plus and minus buttons labeled only "+" and "-". SR reads
  meaningless single characters.
- New value announced by re-rendering the whole row. SR user hears
  the entire row read again instead of just the new value.
- Button state does not reflect bounds. User at max keeps tapping
  "increase" with no feedback. The button should disable.
- Mobile: tap targets under 44 by 44 dp. WCAG 2.5.5 Enhanced fails,
  and often WCAG 2.5.8 Minimum too if there is no gap between the
  minus and plus buttons.
- iOS custom implementation with two separate buttons instead of
  Adjustable. VoiceOver users have to navigate to each button
  individually and cannot use the swipe gesture they expect.
- Android custom implementation without merged semantics. TalkBack
  reads three separate elements ("minus, button; 2; plus, button")
  instead of one adjustable value.
- Web spinbutton (Path B) with no keyboard support. Only touch and
  mouse work. Keyboard-only users and switch-control users are locked
  out entirely.

---

## Decision guide: which stepper for which job

| Situation | Use |
|---|---|
| Multi-screen form with three or more sequential steps | Wizard stepper |
| Single form with several logical sections on one screen | Section headings, no stepper |
| User picks a small integer between defined bounds, typing rare | Numeric stepper |
| User enters an arbitrary number (age, amount, phone) | Plain numeric input |
| Range with many values where slider makes sense (volume, brightness) | Slider, not stepper |
| Long process where user might come back later | Wizard stepper with save-and-resume |

---

## Testing checklist (screen-reader first)

Run each of these on a real screen reader with real assistive input.
Automated checks catch some of it. None catch all of it.

**Wizard stepper:**

1. Tab through the stepper. Every step must be a real focus stop with
   an accessible name and either a "current step" announcement (on the
   active one) or a "N of M, list item" announcement.
2. Activate a step. Confirm the polite-region announcement fires with
   the new step number and title.
3. Confirm focus moves to the first form field or step heading, not
   left on the "Next" button.
4. Deliberately trigger a validation error. Confirm the assertive
   announcement fires and focus lands on the first invalid field with
   `aria-invalid` and a linked error message.
5. On mobile: swipe left and right in VoiceOver / TalkBack across the
   stepper. Each step must be reachable and named.

**Numeric stepper:**

1. Tab to the widget. Confirm it announces as either a numeric input
   with a label and current value, or as a spinbutton with valuenow
   and valuetext.
2. Press Up and Down arrows (web) or swipe up and down (iOS
   Adjustable, Android with increment/decrement semantic actions).
   Confirm the new value is announced.
3. Reach the maximum. Confirm the "increase" control announces as
   dimmed or unavailable.
4. Reach the minimum. Confirm the "decrease" control announces as
   dimmed or unavailable.
5. Check tap-target size against WCAG 2.5.8 (24 by 24 CSS pixels) at
   minimum, WCAG 2.5.5 (44 by 44 CSS pixels) for AAA. Do not skip
   this on mobile.
6. On iOS custom implementations: confirm the widget is a single focus
   stop with the Adjustable trait, not two separate button focus stops.

---

## Where I would use each pattern in AMASAMYA

- **Wizard stepper**: any future setup flow that goes across several
  screens. A first candidate is the VPAT 2.4 ACR authoring wizard on
  the platform, if we split it out of the single-screen VPAT tab.
- **Numeric stepper**: not currently used anywhere in AMASAMYA. If we
  add a "sample size for a manual audit" field or a "crawl depth"
  input, that is the right shape for it.

Everything above is generalisable to any team building either
component. The failure modes are consistent across products because
they trace back to the same three or four accessibility APIs.

---

## References worth linking when this becomes a blog post

- ARIA Authoring Practices Guide, Spinbutton pattern:
  https://www.w3.org/WAI/ARIA/apg/patterns/spinbutton/
- WCAG 2.2 success criterion 2.5.8 Target Size (Minimum):
  https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum
- WCAG 2.2 success criterion 3.3.4 Error Prevention:
  https://www.w3.org/WAI/WCAG22/Understanding/error-prevention-legal-financial-data
- MDN `<input type="number">`:
  https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/number
- Apple Human Interface Guidelines, Steppers (iOS):
  https://developer.apple.com/design/human-interface-guidelines/steppers
- Material Design 3, Stepper (Android):
  https://m3.material.io/components/stepper/overview

---

Draft length: about 2,300 words. Adjust as needed before publishing.
