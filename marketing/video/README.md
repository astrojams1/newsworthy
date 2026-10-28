# Newsworthy — Three ways to say enough

Three finished vertical advertisements, made with Remotion, React and TypeScript. Product behavior is unchanged. Open [the viewing page](index.html) through a local server to watch or download each film.

| Film | Duration | Finished MP4 |
|---|---:|---|
| A — The Anti-Feed | 22 seconds | [More. More. Enough.](output/A-AntiFeed-1080x1920.mp4) |
| B — The $1 Proposition | 22 seconds | [Pay with a dollar.](output/B-OneDollar-1080x1920.mp4) |
| C — The Full Stop | 24 seconds | [News. Full stop.](output/C-FullStop-1080x1920.mp4) |

All three are **1080 × 1920, 30 fps, H.264 MP4, yuv420p, stereo AAC at 48 kHz**. 30 fps gives the typography a deliberate editorial cadence while keeping the feed acceleration and camera moves fluid. All essential meaning is on screen. These are social advertisements, not App Store preview submissions.

## Creative direction

**A: Make excess exhausting, briefly.** A single word, MORE, becomes a mechanical vertical stream. It accelerates without flashing. At 3.5 seconds the sound and stream stop. “Enough.” is the release. An actual app screen then earns the proposition: one score and one sentence. This was the initial creative recommendation: the opening expresses the problem immediately, and the product is the visual relief. The statement “Stay informed. Not addicted.” is positioning, not a medical or guaranteed-outcome claim.

**B: Make the business model visible.** A large dollar, a single “Once,” and a typographic receipt make the small paid download tangible. The receipt is advertising typography, not a fabricated purchase record. The dark reading screen gives this film a separate visual register. “Pay once. Keep your attention.” connects the price to the product’s lack of a monetized feed. The owner subsequently reported that B performed best by far; it is now the recommended lead creative.

**C: Give news a full stop.** The film starts where feeds never do: “The end.” Its punctuation becomes a moving object, expands into a black field, and later follows a finite seven-day line. Native reading and timeline captures provide the product evidence; the seven-day graphic explains the boundary outside the interface. The final dot becomes the brand dash. This is the most distinctive brand film and a possible challenger to the winning B cut.

**Performance update:** the owner reported, “B performed best by far.” This supersedes the initial recommendation of A. The underlying metric, figures, audience and test conditions were not supplied, so no numerical lift or cause is inferred.

## Product integrity

Read [PRODUCT-EVIDENCE.md](PRODUCT-EVIDENCE.md) for repository sources, price verification, and capture provenance. The $1 is the United States price, paid once; regional storefront prices vary. The App Store listing is [Newsworthy: Calm News](https://apps.apple.com/app/id6812519450).

Screens are unretouched native simulator captures from 1 October 2026. Their historical news and original timestamps are preserved, with a dated label outside the device. They do not claim to show current news. The bounded timeline is real; its screenshot does not show the final entry, so C uses a separate editorial diagram to explain the one-week limit. We do not fabricate a “You’re done” screen, claim complete news coverage, or imply that the app blocks scrolling or cures addiction.

The current user brief explicitly authorizes new anti-doomscrolling positioning, price advertising, a purchase CTA and authentic app imagery. Those instructions govern this separate campaign; existing store trailers and application messaging are preserved.

## Files

- `src/`: deterministic frame-based compositions, shared type and device treatment.
- `public/ui/`: original native captures copied unchanged.
- `public/fonts/`: Inter variable and Roboto Mono, with their SIL OFL licenses.
- `public/audio/`: original synthesized stereo masters and sound-design notes.
- `scripts/audio.py`: reproducible sound synthesis; no stock or commercial samples.
- `output/`: finished MP4s.
- `previews/`: full-resolution decoded preview frames, cover images and contact sheets.
- `qa/`: media verification, safe-zone boards and review notes.
- [TIMELINES.md](TIMELINES.md): exact on-screen scripts and cues.

## Reproduce

Requires Node 22+, Chromium, Python 3 with numpy and Pillow, and ffmpeg/ffprobe. Remotion packages are pinned together in the lockfile. Remotion’s licensing terms apply to use of its tools; see https://www.remotion.dev/license.

```sh
cd marketing/video
npm ci
python -m pip install numpy Pillow
python scripts/audio.py
npm run typecheck
npm run stills
npm run render -- --draft
npm run render
npm run verify
node scripts/review-page.mjs
python -m http.server 8765
# Open http://localhost:8765
```

The default browser is `/usr/bin/chromium`; set `CHROMIUM_PATH` to another Chromium executable if needed. Rendering uses three workers, PNG frame sampling, explicit BT.709 color conversion and CRF 16 for the final H.264 masters. `npm run studio` opens the editable Remotion compositions.

Render one film with `npm run render -- --only=A` (or B/C). Alternative opening copy is implemented as the `hook: "alternate"` composition prop; render with `npm run render -- --only=A --alternate`. These variants retain the same film after the opening. Exact variants are listed in TIMELINES.md; they are available in source, not included as additional finished deliverables.

## Quality review

The films went through complete draft renders, representative full-size still review, independent visual/copy review, revisions, then final MP4 decoding and playback checks. See [qa/REVIEW.md](qa/REVIEW.md) for the changes and verification limits. Measurements and SHA-256 input/output hashes are in [qa/verification.json](qa/verification.json).

Typography was checked against the repository’s measured Shorts safe area. Abstract moving MORE repetitions intentionally bleed; essential ad copy remains protected. Native timeline content naturally continues below the viewport. A desktop check does not establish every TikTok/Reels/Shorts overlay on every phone. Audio was synthesized and objectively measured, but not auditioned by ear in this environment.

## B opening variants

Following the reported win for B, three finished opening-copy tests are available: [view and download the variants](b-hooks.html), or read [the scripts, comparison notes and rendering instructions](B-HOOKS.md). Only the first three seconds’ headline changes. The remainder of the winning video and its full soundtrack are preserved exactly.

## Release use

Lead with B and preserve the original cut as the control. The three produced opening variants change only its first headline, retaining the $1 offer, one-time purchase framing, product reveal and final CTA. Keep audience, placement and spend comparable, and use purchase conversion alongside viewing retention to evaluate variants. The reported result establishes the strongest performer in the owner’s comparison; it does not isolate which element drove performance. Use the App Store link in a clickable profile or ad destination, and the on-screen search name where links do not click. This production session did not upload, publish or send the films; subsequent distribution details were not supplied.
