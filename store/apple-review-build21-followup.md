# Build 21: September 24 review follow-up

## Current result

At **2026-09-24T06:19:05Z**, the Apple API confirmed version and submission
**WAITING_FOR_REVIEW**, with build21 still selected. The updated physical-device
video and six-part response were posted at2:17PM console time; the same Notes
were saved and read back before resubmission. See
[submission receipt](apple-review-resubmission-2026-09-24-video.json),
[recording evidence](apple-physical-review-video-2026-09-24.json), and
[posted response](apple-review-response-2026-09-24.md). Approval and public
availability remain unconfirmed.

## Earlier rejection

At 2026-09-24T05:12:31Z the App Store Connect API reported version `REJECTED`
and submission `UNRESOLVED_ISSUES` for submission
`4f28761f-3096-4f0d-aa37-df83332f818f`. Browser readback confirms selected
**1.0.0 (21)** and Apple's September 24, 12:40 PM (console local time) message.
This supersedes the earlier Waiting for Review observation; the submission
receipt remains historical evidence of the successful resubmission.

## New request

Apple cites **Guideline 2.1 — Information Needed — New App Submission** and
requests a physical-device recording on the latest operating system, beginning
with app launch and demonstrating typical functionality. It again requests
purpose/audience, setup, external services, regional behavior and applicable
regulated-service/content authorization information in both the reply and review
Notes. This message does not repeat Guideline 4.2; it does not establish that all
other guidelines have been approved.

The existing six-part Notes cover the app and accurately identify the prior
recording as build 7. That recording predates Settings and notifications.
A replacement demonstration should show build 21, launch, reading, Settings,
notification choice and threshold, appearance, sharing and both widget sizes.
No accounts, user-generated content or additional paid features exist.

## Attachment verification and updated recording

On September 24 the September 17 message still showed the original attachment.
It downloaded successfully with SHA-256
`1bd143661f82fca77767726179d0ee9b61abe4e352bfe083a0bbf93121550068`,
matching the previously posted review copy. A fresh API readback confirmed the
six-part Notes remain saved. Apple did not specify whether the attachment was
overlooked, inaccessible to the reviewer, or insufficient; an updated
demonstration is a response to the new request and changed features, not a
confirmed explanation of the rejection.

The owner supplied an updated recording. The initial iCloud item stalled, but a
second local copy became readable. The complete39.27second original was retained;
the review copy removes only the first6seconds of idle Home Screen, preserves
the continuous launch/feature sequence, and uses H264 video without audio.
It shows both widget sizes, launch, reading, Settings, notification threshold
changes and dark appearance. It does not display the OS or TestFlight build
number, so no fresh OS/build verification is claimed. The current submission
build remains21; prior installation evidence is separate.

An alternate iCloud web sign-in reported a security-locked Apple Account. No
recovery or credential change was attempted; that path was abandoned once the
local recording became available. No iCloud owner handoff remains for this video.

## Earlier physical-access observation

The known iPhone's last available developer-device metadata reports iOS 26.6.2
and no connected developer tunnel. iPhone Mirroring reports the iPhone is in use
and requires locking it before connecting. It cannot currently be controlled to
record or verify an OS update. Apple's current security-release page identifies
iOS 27 as latest on September 24; recheck on the actual recording date.

The owner must make the phone available and complete any on-device OS update or
passcode step. Preserve the actual recording and verify the build/OS; do not
represent an older recording or a simulator as the requested evidence. After the
new recording is available, prepare the review copy, send it with the six-part
reply, save the matching Notes and verify the resulting review state.

The earlier access limitation did not prevent submitting the subsequently
supplied recording. The posted response makes no unverified latest-OS claim.

Source: [Apple security releases](https://support.apple.com/en-ca/100100).
