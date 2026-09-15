# Newsworthy design system

`palette.json` is the source of truth for the approved ten-level palette, brand colors, appearance, typography, and radii. Generated files must be regenerated instead of edited independently.

```sh
npm run design:assets   # Update tokens, native colors, widgets, icons, and share art
npm run design:check    # Detect stale web/Android/iOS tokens
node --test test/design.test.js
```

## Which color belongs where?

| Surface | Palette |
| --- | --- |
| Main reading, favicon, browser chrome | The validated, displayed score, including saved readings |
| Android widget | The score in the widget's own saved reading |
| Admin chart, links, selected controls | The admin's latest displayed score |
| About dialog | Inherits the current reading |
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

`ReadingProvider` owns one reading subscription for the home screen, navigation header, and About screen. `useTheme` derives the palette from that reading and one shared system appearance. Native uses `useColorScheme`; web uses a hydration-safe system media subscription so static light HTML cannot leave stale text colors on a dark client. Decorative gradient textures are generated from the same tokens and rendered by `expo-image`, so Expo Go, custom native builds, and web do not depend on experimental native gradient APIs. Missing readings keep the canvas neutral.

Source assets and the Android config plugin preserve the design through Expo prebuild. The iOS widget target owns its generated color catalog. Android prebuild and web/TypeScript checks are verified; custom native builds and on-device widgets still need verification with compatible SDKs/signing.

## Preview

`artifacts/level-gradients/preview.html` shows all ten palettes, favicons, widgets, controls, and fixed app identity in both appearances. It imports the production tokens and favicon renderer. The widget is a browser representation of the native three-stop treatment.

## Platform references

- [Android RemoteViews](https://developer.android.com/reference/android/widget/RemoteViews)
- [Apple named colors and Dark Mode](https://developer.apple.com/design/human-interface-guidelines/dark-mode)
- [Apple app icon asset catalog](https://developer.apple.com/documentation/xcode/configuring-your-app-icon)
