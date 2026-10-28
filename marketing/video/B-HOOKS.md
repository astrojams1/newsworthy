# B — Opening-copy tests

Three complete 22-second advertisements built from the winning B film. Each changes **only the headline during 0–3 seconds**. The $1 artwork, “Pay with a dollar.” line, typography, placement and timing are retained. From 3 seconds onward, all 570 video frames are copied from the control, and its entire original audio track is retained.

[Watch the control and all three variants](b-hooks.html).

| Cut | Exact opening headline | What it tests | Finished MP4 |
|---|---|---|---|
| B control | YOUR ATTENTION IS WORTH MORE. | Original winner reported by the owner | [Original B](output/B-OneDollar-1080x1920.mp4) |
| B1 — Category clarity | A NEWS APP. FOR ONE DOLLAR. | Whether identifying the product immediately helps viewers understand the offer | [B1](output/b-hooks/B1-App-1080x1920.mp4) |
| B2 — Purchase certainty | ONE DOLLAR. NO MONTHLY BILL. | Whether removing subscription uncertainty strengthens the opening | [B2](output/b-hooks/B2-Once-1080x1920.mp4) |
| B3 — Attention | BUY THE APP. KEEP YOUR ATTENTION. | Whether a direct purchase invitation tied to attention performs better | [B3](output/b-hooks/B3-Attention-1080x1920.mp4) |

All are 1080 × 1920, 30 fps, H.264/yuv420p/BT.709, with stereo AAC at 48 kHz and fast-start MP4 layout. The video is exactly 22 seconds; the original AAC padding gives the container a duration of about 22.059 seconds.

## Exact timeline

- **0–3s:** the variant headline above; the unchanged large `$1.` and `Pay with a dollar.`
- **3–6s:** `ONE-TIME PURCHASE`, `Once.`, then `Not every month.`
- **6–10s:** the original receipt: `NEWSWORTHY / WHAT YOU GET`, `World news, rated.`, `No subscription.`, `No ads.`, `Total`, `$1`, `USD · ONE-TIME PAID DOWNLOAD`.
- **10–17s:** the original dark native capture and captions: `A small app. A clear purpose.`, then `A score. A sentence. No feed.`; `RECORDED 1 OCT 2026` stays outside the device.
- **17–22s:** the original endcard: `Newsworthy.`, `Pay once. Keep your attention.`, `$1`, `ONE TIME. US PRICE.`, `Get it on the App Store`, and `Search “Newsworthy: Calm News”`.

The full original cue timings and historical screen text remain in [TIMELINES.md](TIMELINES.md). Product evidence and the one-time US$1 price are in [PRODUCT-EVIDENCE.md](PRODUCT-EVIDENCE.md). B3 is attention positioning, not a quantified time-saving or health claim.

## Fair comparison

Keep the original B as the control. Use the same audience, placement, accompanying post/ad copy, CTA destination, attribution window and comparable delivery for every cut. These variants isolate opening wording; do not change the soundtrack, pacing or endcard for this comparison. Prioritize purchases when assessing the purchase objective, with retention and click-through as supporting measures.

The owner reported that B performed best by far; no numerical results or metric were provided. The new variants are untested. Nothing in this follow-up was published or used for advertising spend.

## Reproduce

From `marketing/video`, after `npm ci`:

```sh
npm run hooks:stills
npm run hooks:render
npm run hooks:verify
node scripts/b-hooks-page.mjs
node scripts/check-b-hooks.mjs
python -m http.server 8765
# Open http://localhost:8765/b-hooks.html
```

Use `npm run hooks:render -- --only=B2` to render one cut. Edit `src/b-hooks.json` for future wording. The variants are also full-length editable compositions in Remotion Studio (`B1-App`, `B2-Once`, `B3-Attention`). `openingHeadline` affects only B's first three seconds; existing default compositions retain their original copy.

The delivery renderer verifies the control's SHA-256 and the keyframe at exactly 3 seconds before rendering. Remotion renders frames 0–89; ffmpeg joins this opening to a stream copy of the control's remaining video and copies the complete control AAC track. The three original MP4s are not rewritten. Keep the original B file with this workspace: it is an intentional production dependency for preserving the winning cut exactly.

## Review and evidence

Full-resolution opening and boundary stills were visually inspected before rendering. A separate product/copy review found all three hooks supported and distinct. Final verification decodes all frames and requires every frame after 3 seconds, every decoded audio sample, and the encoded AAC payload to match the control exactly. It also verifies format, duration, stream integrity and fast-start layout.

- [Opening comparison](previews/b-hooks/opening-comparison.jpg)
- `previews/b-hooks/`: decoded opening, transition, product and closing frames; contact sheets and cover images.
- [Render provenance](qa/b-hooks/render.json)
- [Frame/audio verification](qa/b-hooks/verification.json)
- [Text bounds and wrapping checks](qa/b-hooks/layout-check.json)
- [Browser playback results](qa/b-hooks/playback-check.json)

The original production manifest `qa/verification.json` is retained as historical evidence and pins the control file. Its input hashes predate this source extension. The new manifest in `qa/b-hooks/verification.json` records the current hook source and assets. No new audio was composed; the sound is the original, measured soundtrack, which was not auditioned by ear in this environment. Browser playback is muted instrumentation, supplemented by visual inspection of decoded frames.
