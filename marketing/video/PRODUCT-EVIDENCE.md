# Product evidence

Research and production date: 28 October 2026. These films use the repository's product source, release records and retained native screenshots. This production did not make a new native iOS capture or independently query the live App Store.

## What Newsworthy does

Newsworthy presents a score from 1 to 10, a short sentence about the top story, and a checked/story-age line. Higher scores indicate greater assessed consequence. The displayed score fades as developments age. The canonical description is **“World news, rated by significance.”**

The reading is the first screen. Beneath it, a timeline contains one entry per development, ordered by first coverage, covering the past week. Repeated reports of a development do not create repeated timeline entries. The timeline is enabled by default and can be hidden in Settings. It has a deliberate one-week boundary; the app does permit scrolling within that boundary.

The app also supports small and medium Home Screen widgets, light/dark appearance, sharing, a saved last reading offline, and optional notifications. Notifications are off by default and use a selected score threshold. These films focus on the reading and the finite timeline rather than presenting a feature tour.

| Film claim | Repository evidence | Scope |
| --- | --- | --- |
| A score and a sentence | [`apps/client/app/index.tsx`](../../apps/client/app/index.tsx), [`apps/client/lib/onboarding.js`](../../apps/client/lib/onboarding.js) | Concise significance indicator, not a complete briefing. |
| “World news, rated” | [`docs/product-messaging.md`](../../docs/product-messaging.md) | Canonical external positioning. |
| No feed / the list ends | [`docs/story-timeline.md`](../../docs/story-timeline.md), [`apps/client/components/timeline.tsx`](../../apps/client/components/timeline.tsx) | Finite, optional one-week timeline; not a claim of no scrolling. |
| One-time US$1 purchase | [`store/store.json`](../../store/store.json): `pricing.basePrice = "1.00"`, `baseCurrency = "USD"`, `type = "paidDownload"`; listing and review notes describe one-time purchase | US price. Local storefront amounts vary. No lifetime service guarantee is implied. |
| No subscription / no ads | [`store/store.json`](../../store/store.json), [`docs/product-messaging.md`](../../docs/product-messaging.md) | The listing also states no in-app purchases and no account/login requirement. |
| On the App Store | [`store/ledger.md`](../../store/ledger.md), entries 440 and the 22 October banking update; [`docs/product-messaging.md`](../../docs/product-messaging.md) | Repository records iOS 1.0.0/build 27 on sale in 175 territories on 21 October, and Apple's public lookup showing `$1.00` on 22 October. |

App Store destination: <https://apps.apple.com/app/id6812519450>. Search name: **Newsworthy: Calm News**. The films advertise the iPhone app. Android availability is not claimed.

## Product images and provenance

All three `public/ui/*.png` files are copies of retained native screenshots. The film adds a simple device surround and animates the screenshot as a single image; it does not replace the number, sentence, timestamp, native typography, controls, or background. Rounded device clipping and scaling are presentation treatments.

| Production asset | Original capture | SHA-256 of original |
| --- | --- | --- |
| `public/ui/reading-light.png` | `store/source/iphone-6.9/02-reading-light-v26.png` | `eef9102617d91fed175f7e635d924e23557d737172c78820ab1ba815d6cd810f` |
| `public/ui/reading-dark.png` | `store/source/iphone-6.9/03-reading-dark-v26.png` | `d1e231561178a5d041a54e10cccb114404ef0eda6d4fbee998c8083dd2c7b367` |
| `public/ui/timeline.png` | `store/source/iphone-6.9/01-timeline-v26.png` | `68b3f08cf6d685a7b8ccdb99b8717ae78628b5dd057bb9bb4b0588cc04961918` |

The authoritative capture record is [`store/source/ios-gallery-v26-provenance.json`](../../store/source/ios-gallery-v26-provenance.json). It records native simulator captures on 1 October 2026: iPhone 17 Pro Max, iOS 26.5 (23F77), 1320 × 2868 PNGs, application source commit `51826ed4fe7a12c5d21a749f8c83c2269a6a6521` matching release build 26. The actual simulator bundle reports version 1.0.0/build 1. This is native simulator evidence, not physical-device verification or certification of the released binary.

Each product shot is labelled **“RECORDED 1 OCT 2026”** outside the phone. The news and relative age text are historical screenshot content, not live news or newly verified reporting. Some retained sentences contain forecast wording that later writing guidance removed; the films preserve the original pixels rather than quietly rewriting that history.

In C, the native timeline appears from 12–14 seconds. It shows a portion of the list, not its bottom. The subsequent **“7 days. A list that ends.”** graphic, from 14–17 seconds, is an editorial explanation of the verified one-week limit. Its seven marks are a visual metaphor for days, not seven news items, an in-app completion screen, or a new product control.

## Design decisions grounded in the product

The films inherit the app's restraint: generous empty space, large numerals, quiet supporting text, a dash as the brand mark, and a small palette. Native captures preserve the app's actual typography and score-dependent background. Film typography uses the repository's licensed Inter variable font. Film colors are near-black `#16161A`, paper `#F4F2ED`, muted stone, and one restrained terracotta accent; these are editorial surfaces, not changes to the application palette.

Reference sources: [`design/palette.json`](../../design/palette.json), [`design/surfaces.json`](../../design/surfaces.json), [`public/tokens.js`](../../public/tokens.js), and [`apps/client/components/brand-mark.tsx`](../../apps/client/components/brand-mark.tsx). The static film dash never purports to be a current news score.

## Claim limits and authorization

“Stay informed. Not addicted.” and the attention/ending language express the user's advertising brief and the product philosophy. They are not measured health outcomes, addiction treatment, guaranteed saved time, or evidence that a reader will never check compulsively. No statistics, testimonials, endorsements, sources feature, emergency capability, realtime updates, or complete coverage are claimed.

The current brief explicitly requests anti-doomscrolling and price positioning, superseding older general copy guidance against those advertising themes. No application behavior, rating calibration, or public product surface was changed for this production.

Original synthesized sound and licensed fonts are documented separately in [`public/audio/sound-design.md`](public/audio/sound-design.md) and the font license files under `public/fonts/`.
