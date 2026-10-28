# Review record

## Product and creative review

The repository was fetched and work started on `codex/newsworthy-three-films` from `origin/main` at `1115457`. The application, product messaging, palette, native layout source, store pricing and released-status evidence were inspected. A separate reviewer checked claims and native capture provenance, then reviewed the actual rendered stills.

All production work is isolated in `marketing/video`. Existing application behavior, rating calibration, store videos, and store listing text were not modified. The two existing campaign ledgers receive append-only records of this work.

## Iterations

1. Implemented three complete 22/22/24-second Remotion compositions and original stereo soundtracks. Rendered all three draft MP4s at half resolution and representative stills at full resolution.
2. Inspected opening frames, product shots, endcards and contact sheets. Corrected a screenshot-aspect mismatch that exposed white below the phone screen, and moved the capture date out of the native story-age line.
3. Replaced an unsupported diagonal-arrow font glyph with a vector arrow. Declared the variable font’s full weight range so the intended editorial weights interpolate correctly.
4. Strengthened B’s attention/price hook and differentiated it with the authentic dark reading capture.
5. C’s original timeline shot did not show the bottom of the list. Shortened it to a truthful glimpse of the list and added an editorial seven-day diagram. Made its period move, expand, stop, and become the brand dash; removed a duplicate period and corrected punctuation spacing.
6. Rendered full-resolution cuts and inspected decoded product and punctuation frames. The first export’s default JPEG pipeline produced full-range BT.601-family video; rerendered with PNG inputs and explicit BT.709 conversion for final delivery.
7. The half-second encoded-frame boards exposed an unintended light flash at B’s dark endcard boundary. Kept its base canvas dark through the endcard. Rerouted C’s moving period on a curved path around the headline, so it never passes through letterforms. Rerendered both affected films.
8. Decode, audio, browser playback, layout and encoded-frame evidence are recorded in the files below. Final representative previews are extracted from the delivered MP4s, not editor screenshots.

## Evidence

- `verification.json`: complete-file decode results, video/audio stream properties, LUFS/true peak, and SHA-256 input/output hashes.
- `layout-check.json`: visible editorial text bounds sampled every six frames against the measured Shorts safe zones. Repeated background MORE words intentionally bleed and are excluded.
- `*-safe-zones.jpg`: final decoded frames every half-second, with measured keep-out overlays. These also show native screen content, which is rasterized and cannot be checked with DOM text bounds.
- `A-silence-cut.jpg`, `C-period-wipe.jpg`, `C-period-to-dash.jpg`: consecutive 0.1-second samples from the encoded transitions.
- `playback-check.json`: real-time muted playback of each H.264 master in Chromium, with decoded frame callbacks and ended events.
- `viewing-page.png`: local review page with all three finished films.
- `../previews/*-contact-sheet.jpg`: representative decoded scene frames.

The React/TypeScript implementation was typechecked and reviewed using the React best-practices skill. Animation state derives from Remotion’s frame clock, with no effects, random layout or external requests. Full production-app tests were not necessary for this isolated advertising workspace; no app source changed and no code was pushed.

## Verification limits

Motion was evaluated through closely spaced decoded frames and real-time browser playback instrumentation; this is not a claim of human cinematic playback review. Sound was objectively measured and sample-checked, but not auditioned by ear. The native captures are repository evidence dated 1 October 2026, not fresh native or physical-device verification.

The safe-zone reference comes from the repository’s YouTube Shorts skill, measured on an iPhone 16 Pro. It is included as `safe-zones.json` for reproducibility. Source provenance: `vendor/skills/skills/youtube-shorts/assets/zones.json`, submodule commit `ec8729401fdfad46d15a20ebde2a79e96f36f2b9`. A local browser cannot prove the overlays used by every social application and device. The finite timeline screenshot naturally contains partial content below the primary reading zone; the ad’s seven-day claim is carried by the separate, fully protected diagram.

No social publication, upload, advertising spend or audience performance measurement occurred. A is recommended on creative grounds; there are no invented results.
