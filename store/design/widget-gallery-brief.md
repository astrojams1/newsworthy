# Widget gallery revision

Owner direction, September 16, 2026: remove unrelated apps from widget imagery,
feature the different supported size options, and replace the clashing stock
wallpaper with a plain neutral background. The existing iPhone Home Screen
capture is superseded for final listing use; do not submit it again as final art.

## Native capture plan

- Use a clean simulator/emulator Home Screen page with plain neutral wallpaper:
  soft off-white/gray for light captures and charcoal for dark captures. Set this
  through the native simulator/emulator UI; do not alter the owner’s personal
  device wallpaper. No stock photo, vivid color blocks, or competing gradients.
  Match the same neutral treatment across sizes within each platform. Move
  unrelated icons off that page through the supported UI; do not edit icons out
  of a screenshot or manufacture widget content.
- iOS implements **small and medium**, not large. Capture both on the clean page,
  and inspect each at full resolution. Small shows score and reading time;
  medium adds the news sentence. Do not advertise a complete sentence in small.
- Android implements a horizontally/vertically resizable widget. Capture its
  compact and expanded layouts through the actual launcher resize controls.
  The explanation becomes visible when both width and height pass the compact thresholds. Label
  them compact/expanded unless the actual launcher grid size has been verified.
- Prefer one lead image showing both supported layouts clearly, followed by the
  approved reading screen and dark appearance. Add a second widget close-up only
  if the full-size artwork cannot make both sizes readable.
- Capture real live readings, preserving their timestamps. Never fabricate a
  reading, claim immediate refresh, substitute web UI, or relabel another OS.
- Capture again from the replacement native builds listed in `../release.json`.
  Inspect all clipping, truncation, labels, touch-to-open behavior and theme
  contrast before uploading. Save platform/build/runtime/size provenance.

## Neutral composition fallback

The iOS 18.3 simulator does not expose Wallpaper settings. The final iPhone
artboard therefore frames actual native small and medium widget surfaces as
close-ups on a plain warm off-white (`#F4F3EF`) vector canvas. Original full-screen
captures remain intact in `source/iphone-6.9/04-widget-sizes-native.png`. This is
an editorial composition, not a claim that the simulator Home Screen wallpaper
was changed. No UI, score, explanation or timestamp is generated or retouched.
The two sizes retain the same scale relative to one another. Rounded viewport
masks exclude the wallpaper outside each widget.

## Current evidence and next action

The Mac is unlocked. Replacement iOS simulator build from commit `b5571c5` is
installed on iPhone 16 Pro Max / iOS 18.3. Small and medium widgets were added
through SpringBoard's native widget picker and captured. Both show the actual
3/10 reading and original timestamp. Medium truncates a long explanation after
two lines; the gallery preserves that behavior. Small tap-to-open works.
Revised light/dark iPhone reading captures are saved, with no About and the
Privacy/Support footer visible. See the adjacent capture provenance JSON.

Android version 7 expanded rendering was captured as diagnostic evidence in
`source/android-phone/05-widget-expanded-v7.png`, not final artwork. The owner
observed flicker, resize resets and the oversized denominator. Native logs show
a one-time WorkManager completion → component/package change → widget onUpdate
→ new worker loop about every second. This recreates the widget during resizing.
Corrected APK8 is installed, and AAB9 is downloaded and ZIP-validated. Native
logs show zero worker restarts or widget recreations over 65 seconds; the small
baseline `/10` is visible. Automated drags on the resize controls inherited from
the older build did not change the settled size. A fresh owner resize attempt
is pending because CUA cannot reliably send the sustained Android press.
Do not mark compact sizing verified or use version 7 for final widget marketing. Replacement iPad light/dark captures are
complete and the corrected Apple gallery is uploaded and waiting for review.
