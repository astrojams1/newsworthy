# Standalone score / drop-cap study

Open `design/prototypes/drop-cap/index.html` through a static server rooted at
this repository, for example `python3 -m http.server 8765 --bind 127.0.0.1`.
This preview is separate from the production app and is not a shipped UI change.

All five preview surfaces omit the visible denominator. The underlying ten-point
scale remains in accessible labels. Large widgets float the number across the
first three lines, letting subsequent text use the full width. Score 10 remains
one unbroken drop cap. Compact widgets keep their number-only composition.

The page imports the real palette and reading gradient. Proposed expanded digits
are 64px, with 14px text / 20px lines and a 60px float (three lines); compact digits
retain the 52px design contract. `design/surfaces.json` still describes production.
The controls exercise ten scores, light/dark, long/short/unavailable content,
name visibility and larger text. Typed explanations are inserted as text.

Widget heights may grow to preserve the whole sentence at enlarged text sizes.
That is a layout exploration, not a claim that fixed-size WidgetKit or Android
RemoteViews widgets support this behavior. Native implementation must choose
and verify overflow behavior, font metrics, accessibility, resizing and theme
switches. No native build or store release was made for this study.

## Verification

`npm run test:design` includes the score/empty-state prototype regressions.
`npm test` passes (199 tests, including the web export).

The browser geometry check can be repeated with:

```sh
agent-browser open http://127.0.0.1:8765/design/prototypes/drop-cap/index.html
agent-browser eval --stdin < design/prototypes/drop-cap/browser-check.js
```

Verified at 1200px and 320px browser widths: 36 combinations per width of
scores 1/3/10, light/dark, normal/1.3×/2× text, name shown/hidden, with both
expanded widgets checked in every combination. The check measures text beside
and beneath the number, overlap and overflow, empty state, and deliberately
removes the float to prove the regression is caught. All 72 cases passed.
Light, dark with score 10, and narrow screenshots were also inspected.
These browser results do not establish native visual parity.
