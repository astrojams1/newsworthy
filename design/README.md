# Newsworthy design system

`palette.json` is the source of truth for the approved ten-level palette, brand colors, appearance, typography, and radii. Generated files must be regenerated instead of edited independently.

```sh
npm run design:assets   # Update tokens, native colors, widgets, icons, and share art
npm run design:check    # Detect stale web/Android/iOS tokens
node --test test/design.test.js
npm run test:design     # Cross-surface typography, layout roles, theme bindings and pixels
```

## Which color belongs where?

| Surface | Palette |
| --- | --- |
| Main reading, favicon, browser chrome | The validated, displayed score, including saved readings |
| Android widget | The score in the widget's own saved reading |
| Admin chart, links, selected controls | The admin's latest displayed score |
| Support, privacy, static favicon, splash, share card | Stable mint brand palette with a dash instead of a score |
| App icon and home-screen shortcut | White background with a dark dash in light mode; dark background with a white dash in dark mode; deliberately uncolored |
| Failures | Separate semantic `danger` color, always accompanied by words or a symbol |
| Empty/loading reading | No level assigned; neutral reading canvas and brand favicon |

A static icon must not imply that an old score is current. Widgets can refresh at a different time from the app, so each colors its own displayed reading. No backend score or timing behavior is changed by this design system.

## Web

- `public/tokens.css` and `public/tokens.js` are generated.
- `public/levels.css` owns the layered background and common selection/focus styling.
- `public/favicon.js` is the shared pure favicon renderer. The Expo layout and static-page adapter update the favicon and browser theme color when the reading or system appearance changes.
- `--accent` is a readable derivative of the palette, for links, focus rings, and charts. The raw swatch is for decorative fills.
- `--ink-muted` and `--ink-faint` are for plain or lightly tinted surfaces. `--ink-on-gradient-muted` is for secondary text on stronger gradient backgrounds.
- `data-level="1"` through `"10"` applies a reading palette. Omit it for the brand default. `data-brand` makes a brand background visible.
- `data-appearance` reflects the app’s Light or Dark setting. Follow device removes the override and uses the system appearance; the design preview also uses this attribute.
- The HTML manifest supplies fixed install icons. Social previews use a flat pale mint canvas with only the dash and wordmark,
  not a cached news score. Descriptions belong in metadata, not on the image.

The design test verifies AA text contrast across the opaque gradient stops and control surfaces in both appearances. The live web background uses the same colors in layered radial washes. The number and sentence remain the source of meaning, independent of color.

## Android

`apps/client/plugins/widget-android/res/values/newsworthy_palette.xml` and its `values-night` counterpart provide automatic appearance variants. Generated `widget_level_*.xml` drawables use opaque three-stop gradients for `RemoteViews`. `RatingWidget` chooses the drawable from its own validated score, while text colors remain resource references. These resources are resolved by the host when the widget is applied, including theme reapplication.

App icons use a white background and dark dash in light mode, and a dark background and white dash in dark mode, including adaptive and legacy icons and an Android 13 monochrome mark. The OS controls the final color of themed launcher icons. Splash backgrounds and marks use the fixed brand palette.

## iOS

The widget target’s `Assets.xcassets` contains generated `Newsworthy*`, `Brand*`, `AccentColor`, and `Level01*` through `Level10*` color sets. Every color set has light/dark appearance entries. The app icon has uncolored light and dark variants; Expo’s source configuration selects the app icon variants and the branded splash assets.

`NewsworthyWidget.swift` selects `Level07Start`, `Level07Center`, and `Level07End` (for example) from its timeline entry’s own score. The named colors include both system appearances. `NewsworthyGradientMuted` keeps timestamps readable over the gradient.

## Shared Expo screens

`ReadingProvider` owns one reading subscription for the home screen and navigation header. `useTheme` derives the palette from that reading and one shared system appearance. Native uses `useColorScheme`; web uses a hydration-safe system media subscription so static light HTML cannot leave stale text colors on a dark client. The reading background renders all four layers from `public/levels.css` as an SVG sized to the actual canvas, using `expo-image` on web and native. The ellipse radii, fade stops, compositing order, and 160-degree diagonal match the approved preview without stretching a square texture. The home header is transparent; explicit header-height padding keeps content clear of its controls. Missing readings keep the canvas neutral.

Source assets and the Android config plugin preserve the design through Expo prebuild. The iOS widget target owns its generated color catalog. Android prebuild and web/TypeScript checks are verified; custom native builds and on-device widgets still need verification with compatible SDKs/signing.

## Preview

`artifacts/level-gradients/preview.html` shows all ten palettes, favicons, widgets, controls, and fixed app identity in both appearances. It imports the production tokens and favicon renderer. The widget is a browser representation of the native three-stop treatment.

## Design regression gate

The home header centers the title, Share and Settings touch targets in 48-point
containers. iOS's `square.and.arrow.up` symbol has more visual weight below its
geometric center, so its image moves up 2 points to align optically with the
uppercase title. The touch target stays fixed. The drawn tray-and-arrow glyph on
web and Android's three-node glyph are vertically balanced and have no offset:
measured on the web export, the tray's ink centre sits within half a point of
the wordmark's and the gear's once the lift is removed. `design/surfaces.json`
records these values, and the rendered-icon regression cases reject a missing
correction on iOS or a lift applied to the balanced glyphs. This is an optical
adjustment, not a change to the navigation-bar slots or the title's horizontal
position.

`design/surfaces.json` records the approved typography and widget size rules.
The full reading deliberately uses larger digits than widgets. Compact and expanded widgets use the same 69-point base numeral and a
12-point `∕10`. Expanded descriptions use 14-point text on a 20-point line
rhythm beside the numeral, with truncation at the available height.
All reading surfaces use U+2215 DIVISION SLASH immediately followed by `10`.
The monospace glyph side bearings provide the small visible gap;
the division slash’s stroke sits optically alongside the lining numerals instead of the ordinary
slash’s descending tail. Keep the denominator compact. In the iOS widget each glyph uses its own measured
ink bounds to align its visible bottom to sentence line three; there is no guessed
vertical offset. The slash and numerals retain their natural monospace advances. Shared/copied readings
retain plain `/10`, and the app accessibility label remains “out of 10”.
Monospaced score/denominator fonts (SF Mono Light in both the iOS app and widget,
requested as `ui-monospace`/300 in React Native and the native monospaced light
font in SwiftUI; monospace on Android/web), launcher cell geometry, iOS's optional hidden name, timestamp
formatting, and the app's larger-screen spacing are intentional platform variants.
Do not make one surface look identical by copying another platform's screenshot.

CI runs `npm run test:design` as a named gate and also includes these tests in
`npm test`. It checks:

- The production Expo reading component's rendered props on web/iOS/Android:
  narrow phone, regular phone, landscape, tablet; light/dark; scores 1/3/10/empty;
  normal/double text scale and saved readings (192 render combinations).
- Parsed Android widget layouts: separate small denominator, baseline, type
  weight, spacing, compact/expanded context, adaptive text resource bindings,
  and launcher minimum/resize metadata. Java and Swift source guards check the
  corresponding size choices and reject fixed-color runtime overrides.
- Generated palettes and independent CSS-reference gradient pixels, as before.
- Deliberately reintroduced failures, including oversized `/10`, missing baseline,
  mismatched iOS size, height-only sizing, oversized launcher minimum, and stale
  theme colors. These must make the gate fail.

These are design-contract and rendered-prop tests. They do **not** run WidgetKit,
RemoteViews, Yoga, or a launcher, and they are not native screenshot tests. The
source guards fail closed when their supported expressions change; review the
design and extend the parser/test deliberately rather than weakening the check.
An intentional design change updates the contract and every affected surface
together. Do not regenerate expected values from a failing implementation.

Before marking a UI release verified, inspect actual native small/expanded
widgets in both appearances, score 10, enlarged text, resize behavior and a theme
switch without a data refresh. Capture build/version provenance in `store/`.
Any untested matrix cell remains unverified; green CI cannot fill that gap.

## Widget centering and fresh app readings

Both widget sizes vertically center their reading content between the heading
and timestamp. Expanded widgets center the numeral and sentence as one block,
keeping their capital tops aligned. Long and enlarged text remains bounded.
The design gate rejects top-only expanded placement on both platforms.

Successful foreground app requests hand the public display fields and original
reading timestamp to the native widgets. iOS uses the app group's snapshot and
requests a WidgetKit timeline reload; Android sends an explicit app-private
broadcast and renders from the updated cache. Background fetches remain enabled.
See `store/widget-refresh-verification.json` for this change's verification scope.

The app also reads native widget snapshots synchronously on launch and resume,
before waiting for a network request. iOS publishes the extension's fetched
reading to a separate App Group key; Android exposes the widget's own cache.
Message timestamps take precedence when choosing a reading, with request time
breaking ties for score decay. Older disk or network responses must not replace
a newer widget message. Legacy app caches remain readable.

Refreshes do not add loading sentences, a saved-reading prefix, or retry text to
an existing reading. Its original update time remains visible. An empty first
launch uses the neutral dash without loading copy; only a completed failure with
no reading shows an unavailable message and retry control. Verification and
remaining native release checks live in `store/reading-handoff-verification.json`.

## Platform references

- [Android RemoteViews](https://developer.android.com/reference/android/widget/RemoteViews)
- [Apple named colors and Dark Mode](https://developer.apple.com/design/human-interface-guidelines/dark-mode)
- [Apple app icon asset catalog](https://developer.apple.com/documentation/xcode/configuring-your-app-icon)

The reading-gradient regression fixture captures pixels from Chromium rendering
`public/levels.css` at 160×280 and 280×160, for all ten levels in both modes.
`test/reading-gradient.test.js` compares the shared SVG renderer against those
independent reference pixels with a four-channel-value rasterization tolerance.
If the approved CSS changes, recapture the CSS reference rather than deriving
expected pixels from the SVG renderer.


## Native widget reading layout

The iOS widget uses a native SwiftUI Layout to align the numeral and sentence by
their measured text baselines and capital heights. Small and medium families
share the same base size. The existing Show app name setting frees its title row
and gap when disabled. Description text follows Dynamic Type independently of
the already-large numeral, with an explicit line limit based on available height.

Android uses a horizontal RemoteViews body row with separate, baseline-aligned
score and denominator TextViews. The description fills the remaining column,
uses a 20sp line height, and truncates at the host's available height. The compact
layout keeps only the number and timestamp. Both families use the same 69-point
base numeral; runtime fitting uses the worst-case two-digit width, never the
current score. Palette resources remain adaptive when the host changes theme.

Native verification and remaining launcher/device states are recorded in
`store/widget-layout-verification.json`; a browser study is not evidence for the
native implementation. Web and the main native reading screen are unchanged.

## Reading status copy

Do not add saving, saved, checking, loading, waiting, or refresh status copy to
the reading screen or either native widget, including their accessibility labels.
Keep the original update time with a cached reading. Empty widgets show the
neutral dash with no placeholder sentence or timestamp message. The app retains
its actionable unavailable/retry state only after a failed request with no reading,
and feedback from an explicit Share action. New visible copy requires owner approval.
Regression coverage lives in `test/surface-design.test.js`. Source changes require
a replacement native build before the installed app can change.

## Widget consistency and three-line score alignment

Both iOS families and appearance configurations share a single refresh actor.
Concurrent requests are coalesced; a changed reading publishes one App Group
snapshot and requests a reload of every Newsworthy widget. Reloads reuse a
recent snapshot for 60 seconds to avoid recursive fetch/reload loops. Message
timestamps take priority, with request timestamps resolving same-message decay.
Legacy extension caches remain readable. Android renders all instances under the
same lock and rejects responses carrying an older message. Operating systems
still schedule presentation; refresh requests do not guarantee simultaneous paint.

The iOS container's identity follows the displayed score, so the number and
WidgetKit's separately extracted background are replaced together. Every surface
continues to select its palette from the displayed reading. The approved colors
are unchanged; levels 1 and 3 intentionally have similar green palettes.

All rating numbers and denominators now use a true monospaced face. Both widget
sizes derive their ideal numeral size from three sentence lines. iOS measures
the actual glyph outlines with Core Text, including curved-digit overshoot, and
makes that visible height equal the sentence cap height plus two line heights.
Each denominator glyph receives its measured lower-edge correction rounded to a
device pixel. This aligns the visible numeral top with the first capital and all
four rating glyph bottoms with sentence line three. Android still uses cap-height
measurement and needs its own native verification. Host constraints
may shrink the numeral; those constrained/enlarged states need separate native
checks. The 69-point value is the reference font used to measure this ratio, not
a hard ceiling that prevents the baseline from reaching line three.

Verification for this revision is recorded in
`store/widget-consistency-mono-verification.json`.

Native font measurement found that SF Mono gives regular, thin, hair and narrow
spaces almost the same advance. The denominator therefore uses `∕10`, with no
extra blank: at 12 points it measures 22.06 points instead of 29.48. The slash and
“1” remain visibly separated by their natural glyph side bearings.

The score-to-denominator gap is also compact: iOS widgets concatenate the numeral and denominator
glyph runs without a leading blank; Android uses 2dp and the shared app uses 3pt.
Actual WidgetKit Home Screen verification found automatic margins missing in
the host. The iOS widget now owns 16-point content padding and disables automatic
margins, keeping labels clear of the rounded corners. Actual light/dark captures
and the local build provenance are recorded in the verification file above.

Actual iOS captures and the pixel measurement report are in
`store/source/widget-consistency-mono/alignment-proof.html`. The design gate now
checks untouched screenshot pixels and rejects the earlier misaligned captures.
Those checks establish the captured score-3/default-text states; they do not
prove every score, text scale, operating-system version or physical device.


## Settings navigation and save feedback

The root Expo navigator uses the same resolved light/dark appearance and palette
as the screens. Its ThemeProvider supplies native header material appearance and
the transition canvas; headerStyle/contentStyle alone do not set those. The
reading header stays transparent over its gradient.

Settings rises over the reading as a sheet on iOS and Android (`presentation:
'modal'`) and is an ordinary page on the web. It has its own stack: an overview
with no visible title and a single close control (an X, in glass on iOS 26), and
Appearance and Notifications as pages inside the sheet. Close goes straight back to the reading
(`router.dismissTo('/')`) whatever is stacked behind the overview: a back action
left a second overview in place after a web link to an alerts page redirected to
it, so the first Close did nothing visible. `test/web-settings.test.js` checks
this in a real browser. Opening Settings no
longer pushes a screen beside the reading, so nothing in the reading's header
morphs into a back button. The overview groups rows under sentence-case section
titles in the muted ink, level with the row icons. Every overview row has a
leading icon (an SF Symbol on iOS, a stroked SVG elsewhere, from
`components/glyph.tsx`); a row that opens a page shows its current value and a
chevron, and Privacy and Support, which leave the app, end in a link arrow.
Separators start at the label so the icons read as one column.

The Notifications page is one group: the "High-score alerts" switch, then a
Threshold row showing the chosen score ("8 or higher") that opens its own page
of choices, 5 to 10. Below the group one line says what the switch does: "Get an
alert when the displayed score reaches your threshold, once per development."
No line restates the switch's state; it was removed as noise.

Notification saves show `Saving…` below the controls on either page, and
nothing once saved. No spinner enters the switch row.
Both notification controls are disabled until all queued changes finish, and
pending state belongs to the provider so reopening Settings preserves feedback.
Failures retain the previous subscription state and show the existing error.

`test/surface-design.test.js` checks navigation theme propagation, the sheet
presentation and its stack, and unchanged row structure/styles during saving; `test/preferences.test.js` checks queued
requests, failure, rollback and retry. These are not native layout or iOS glass
rendering tests. Verification limits are recorded in
`store/settings-feedback-verification.json` and the release ledger.
