# Current release gallery refresh

## Scope

Replace the historical reading screenshots that show the old footer with actual
native captures of the current Settings/notification release. Keep the clean
neutral widget composition requested by the owner, with both size options and
no unrelated Home Screen apps or wallpaper in the final artwork. Do not include
an About page or the About section in promotional captures.

## Planned Apple gallery

- iPhone: small/medium widgets on one neutral artboard; light reading; notification
  controls; dark reading.
- iPad: light reading; notification controls; dark reading.
- Notification artwork may frame an explicitly documented native viewport of
  Settings, ending above its About section. Preserve the complete original PNG.
- Use current source `4f519f0`, matching build21 iOS app source (the intervening
  release config change configures Android Firebase). Simulator artifact
  `d182c9bd-fea2-4908-bf73-33d9eac5c1f1`, profile `simulator-release`, finished and was downloaded/extracted. Its actual
  Info.plist identifies simulator version 1.0.0 (1), despite EAS reporting remote
  build version 21; this is a simulator artifact, not the production build21
  binary. Installation on iOS18.3 succeeded; current gallery capture and visual
  verification are unfinished.
- Capture with Simulator Save Screen via computer control, preserving the native
  screen and score. Verify actual bundle version, runtime and PNG dimensions.
- Use factual captions and the existing neutral/brand palette. These are listing
  images, not evidence for Apple's required physical-device review recording.

## Completion checks

Inspect contact sheet/full-size output; validate required Apple dimensions and
RGB PNG format; upload replacements and verify COMPLETE/checksum/order before
removing superseded screenshots. Preserve source/build/capture provenance and
historical files. Current Android gallery needs an equivalent separate refresh
from APK12; do not relabel old Android screenshots as current.

## September 24 capture checkpoint

Current iPhone light reading and Settings captures, Android dark reading and
Settings captures are saved with SHA-256 hashes and build/runtime distinctions
in `current-gallery-captures.json`. The Mac locked before the remaining native
captures could be finished.

`scripts/render-notification-drafts.mjs` renders actual notification-control
viewports into `design/drafts/`, with editable SVGs and a separate draft manifest.
Both drafts were visually inspected: controls and captions fit, About is absent,
and the iPhone/Android enabled states are preserved. Their outputs meet the
1320×2868 and 1080×1920 RGB PNG dimensions. The existing upload manifest is
unchanged. The full renderer now refuses incomplete capture sets before writing
assets; it must also retain a non-ready evidence status until final notification
integration and current widget viewport measurement are complete.
