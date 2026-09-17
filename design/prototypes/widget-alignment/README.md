# Widget numeral alignment study

Browser-only prototype based on origin/main at 8721bc4. Serve the repository root
and open `/design/prototypes/widget-alignment/`. This is separate from the earlier
standalone-score study. Production app and native widget layouts remain unchanged.

## Fixed iOS sizes and provenance

The preview now represents the two supported iOS widget families on the captured
iPhone 16 Pro Max / iOS 18.3 Home Screen:

| Family | Frame (points) | Source crop (3× pixels) |
| --- | --- | --- |
| Medium | 364 × 170 | 1092 × 510 |
| Small | 170 × 170 | 510 × 510 |

Source: `store/source/iphone-6.9/04-widget-sizes-native.png`, provenance in the
adjacent `provenance.json`, and exact crops in
`store/source/layouts/iphone-6.9-02-widget-sizes-v2.svg`. The small widget uses the same numeral size as the medium, in a number-only
layout; the medium adds the explanation beside it.
Newsworthy currently registers systemSmall and systemMedium, not systemLarge.

One CSS pixel represents one iOS point. These are logical layout dimensions,
not a promise of physical screen scale at arbitrary browser zoom. The preview
tray scrolls horizontally on narrow browsers instead of shrinking the widgets.
The 16-point inset is a proposed content margin; rounded corners and browser
font rendering are approximations. Device/OS configurations can differ; see
[Apple widget guidance](https://developer.apple.com/design/human-interface-guidelines/widgets).

## Typography and overflow

The medium frame is always 364 × 170. Its proposed layout reserves a 14-point
name row, a 16-point timestamp row, 8-point gaps and 16-point outer margins,
leaving 92 points for the number and explanation. Hiding the app title removes
its 14-point row and an 8-point gap, giving both widgets 114 points. The selected
three-line numeral stays the same size in both; it does not silently grow when
the title disappears. The timestamp never moves
outside the frame as copy grows.

Default description: 14px text / 20px line height. The numeral aligns optically
with three text lines: visible ink equals the body capital height plus two
baseline intervals. Font size is computed from actual browser digit ink metrics;
it is not simply 60px. The 12px denominator sits beside the numeral on its
baseline with a 6px gap, in the same SVG coordinate system.

The whole sentence is retained in the editor. If it cannot fit, the widget shows
an ellipsis on the last complete line, and a status beneath the frame reports
truncation. If the chosen numeral exceeds the 92-point body, the frame clips it
and explicitly reports that the setting does not fit. This intentionally exposes
infeasible design choices rather than making the frame taller or silently
reducing the selected type size. Text-scale controls are browser stress tests,
not exact mappings to iOS Dynamic Type categories.

Controls cover all ten scores, two-to-four-line numeral, aligned column or
wrapping, light/dark appearance, normal/1.3×/2× text, app title visibility, line guides and custom text.
Samples are fictional and custom text uses textContent. Both widgets use the same SVG numeral renderer, computed font size and
denominator. The title toggle affects both widgets together. Oversized numbers
that exceed the small widget’s width or height get an explicit non-fit notice.

## Verification limits

The native capture establishes frame dimensions for its recorded device/build;
it does not verify the revised layout. No native build was made for this study.
Native font metrics, actual system margins, enlarged text, theme switching,
resizing and truncation behavior remain unverified on iOS and Android. The
production surface contract in design/surfaces.json remains unchanged.

`npm run test:design` includes the fixed iOS frames and source crop dimensions,
as well as optical alignment and enlarged-text regressions. The browser check
covers score 1/3/10, span 2/3/4, both appearances, three text scales and both
layout modes, with the title both shown and hidden. It checks equal numeral
heights, equal reclaimed title space, constant small/medium dimensions, baseline denominator,
text containment, ellipsis and overflow notices. It deliberately reintroduces
growing frames, a denominator below the score and centered text to verify that
each regression is detectable. It also reinstates a 52-point small numeral to
verify that mismatched numeral sizes are caught.

```sh
npx agent-browser open http://127.0.0.1:8766/design/prototypes/widget-alignment/
npx agent-browser eval --stdin < design/prototypes/widget-alignment/browser-check.js
```

Verified 2026-09-17: 35 design tests and 207 full-suite tests pass, including web
export. The browser matrix now covers 216 combinations per viewport with the
title shown/hidden, comparing both numeral sizes and available heights. The
in-app preview was visually inspected with titles on and off. No native build
or revised native layout verification is claimed.
