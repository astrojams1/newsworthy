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
- `data-appearance` is only used by the design preview to show both appearances together. The production app follows the system without a manual override.
- The HTML manifest supplies fixed install icons. Social previews use fixed brand art, not a cached news score.

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

`design/surfaces.json` records the approved typography and widget size rules.
The full reading deliberately uses larger digits than widgets. Compact widgets
use 52-point digits, expanded widgets use 44, and both use a 12-point `∕ 10`.
All reading surfaces use U+2215 DIVISION SLASH followed by U+0020 SPACE
for the displayed denominator. The regular space keeps the slash clear of the “1”;
the division slash’s stroke sits optically alongside the lining numerals instead of the ordinary
slash’s descending tail. Keep the denominator in one text run, on the existing
score baseline; do not add per-platform vertical offsets. Shared/copied readings
retain plain `/10`, and the app accessibility label remains “out of 10”.
Native system fonts, launcher cell geometry, iOS's optional hidden name, timestamp
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

## Numeral alignment prototype

[Widget alignment study](prototypes/widget-alignment/README.md) explores larger
widgets with a sentence left-aligned beside a numeral spanning whole text lines.
The interactive browser study compares two-to-four-line spans and optional
wrapping, retaining the visible ten-point scale. It uses font ink metrics rather
than assuming the numeral's font size equals its visible height. Production
surface contracts remain unchanged; native implementation is unverified.
