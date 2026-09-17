# Widget numeral alignment study

Browser-only prototype, based on origin/main at 8721bc4. Serve the repository
root and open `/design/prototypes/widget-alignment/`. This is separate from the
earlier standalone-score study and retains the visible ten-point denominator.
Production app, compact widgets, native widgets and design/surfaces.json are unchanged.

The current expanded native score is 44 points (56 on iOS with the name hidden).
Android uses 11sp explanation text with platform line metrics; iOS uses caption
text with platform line metrics. Neither source defines an integer score-font /
explanation-line-height relationship.

The proposal uses 14px text with 20px line height. The default numeral aligns
optically with three lines: its visible ink height equals the body capital height
plus two baseline intervals. The occupied text grid is 3 × 20 = 60px, but font size
is computed from the browser font's actual digit ink metrics, not forced to 60px.
This preserves first-line top and third-line bottom alignment across digits.
The denominator occupies another line under the number.

Controls: scores 1–10, two/three/four-line numeral, aligned-column or wrapping
layout, light/dark appearance, normal/1.3×/2× text, line guides, editable sentence.
Custom text is inserted with textContent. The sample content is fictional.
The same existing production widget palette is imported through levels.css.

The two widget examples are 360px and 440px wide, intentionally fixed for a fair
comparison. On narrow browsers the preview tray scrolls horizontally. Widget
heights grow with text; this is not an implementation of fixed native geometry.
Before shipping, implement and verify WidgetKit and RemoteViews behavior,
score 10, both appearances, enlarged text, resizing, theme switches without
refreshing, and text overflow on actual native builds. None is claimed here.

## Verification

`npm run test:design` includes optical alignment regression cases, enlarged text,
and rejection of fractional spans or invalid font metrics.

The browser geometry check exercises 108 combinations of score 1/3/10, span
2/3/4, both appearances, three text scales and both layout modes. Each checks
two widgets for left alignment, score/text overlap, overflow, optical span,
accessible scale and safe custom text. It deliberately centers the sentence
to establish that a lost left edge is detectable.

```sh
npx agent-browser open http://127.0.0.1:8766/design/prototypes/widget-alignment/
npx agent-browser eval --stdin < design/prototypes/widget-alignment/browser-check.js
```

Browser geometry is separate from native visual verification; see store/ledger.json.

Verified on 2026-09-17: all 108 browser combinations passed at both 1280px and
320px viewports (216 combinations / 432 widget checks). Light and narrow
screenshots were visually inspected. Browser reported no page errors.
`npm run test:design`: 33 passing; `npm test`: 205 passing, including web export.
