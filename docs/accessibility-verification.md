# Accessibility and native UI verification

Checked on September 15, 2026. This is an engineering verification record, not
an ADA compliance certification or a complete WCAG audit.

## Implemented

- The score and `/10` share a baseline. The share icon is in the top-right native
  navigation bar and opens the system share sheet. iOS uses an SF Symbol;
  Android uses the familiar three-node share icon.
- All app text colors have at least 4.5:1 contrast against their light/dark
  backgrounds. `test/accessibility.test.js` checks these palettes.
- App controls have minimum 48-point/dp targets and accessible names.
- Text follows the system text size. The wordmark grows to at most 1.5× so it
  stays clear of Share and Settings. Explanations can wrap and
  scroll; the score fits on one line. Content stays clear of navigation controls.
- The score is announced as “3 out of 10,” rather than separate digits and a
  slash. Routine timestamp changes are not live announcements.
- The exported website has a main landmark, a level-one score heading, real
  links, visible keyboard focus, and an unrestricted zoom viewport.
- No flashing, autoplay, animated counters, or motion is required to use the app.

## Exercised

| Check | Evidence |
| --- | --- |
| iOS core screen | Expo Go on iPhone 16 Pro, iOS 18.3, with the live Vercel API |
| Layout | Portrait and landscape; light and dark appearance |
| Text enlargement | Largest available Simulator preferred text size; full sentence and timestamp reachable by scrolling |
| Native interaction | About modal and system share sheet opened successfully |
| Accessibility names | Simulator accessibility tree exposes About, Share, score, explanation, and timestamp |
| Production web export | Hydrated successfully with live data; About opened via keyboard; privacy/support links resolved; no console warnings/errors in the inspected run |
| Automated checks | TypeScript, 21 Expo Doctor checks, and 170 repository tests passed |
| Native packaging preparation | iOS/Android JS bundles exported; prebuild generated both projects and the iOS extension target |

## Release checks still required

- Full VoiceOver and TalkBack navigation, focus order, announcements, and sharing
  on actual devices; an accessibility tree inspection does not replace this.
- Android devices/emulators, back navigation, large fonts/display scaling, and
  platform share-sheet behavior.
- Small phones, tablets, high scores such as 10/10, longest valid explanations,
  and offline recovery on custom builds.
- Widget installation, resizing, large text, screen-reader output, background
  updates, and stale/offline readings in signed/custom builds. Expo Go cannot
  load the widget extensions.
- A broader WCAG 2.2 AA audit and review with assistive-technology users before
  making a public accessibility-conformance claim.

References: [WCAG contrast](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html),
[Apple accessibility guidance](https://developer.apple.com/design/human-interface-guidelines/accessibility),
and [Android accessibility guidance](https://developer.android.com/design/ui/mobile/guides/foundations/accessibility).
