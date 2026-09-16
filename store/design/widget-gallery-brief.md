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
  The explanation becomes visible at the implemented height threshold. Label
  them compact/expanded unless the actual launcher grid size has been verified.
- Prefer one lead image showing both supported layouts clearly, followed by the
  approved reading screen and dark appearance. Add a second widget close-up only
  if the full-size artwork cannot make both sizes readable.
- Capture real live readings, preserving their timestamps. Never fabricate a
  reading, claim immediate refresh, substitute web UI, or relabel another OS.
- Capture again from the replacement native builds listed in `../release.json`.
  Inspect all clipping, truncation, labels, touch-to-open behavior and theme
  contrast before uploading. Save platform/build/runtime/size provenance.

## Current evidence and next action

Code supports the sizes above (`NewsworthyWidget.swift` and
`plugins/widget-android`). Only the older iOS medium widget has been visually
verified. Small iOS, Android resizing, and clean replacement captures remain
unverified. Native UI control is currently blocked by the locked Mac; an unlock
request is pending. Cloud builds and binary processing can proceed independently.
