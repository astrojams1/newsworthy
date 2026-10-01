# iOS widget settings on simulators, 2026-10-01

Branch `claude/zen-bohr-uq2jmd` at 7724b8b with the Appearance parameter changed
to a String from fixed options (the source in this commit), built Release for
the iOS Simulator (arm64) with Xcode 26.6 in an EAS macOS sandbox. Widgets were
driven with AXe on the Home Screen and each state was read from a simulator
screenshot: `lum` is the median luminance (0 black, 255 white) of the widget
crop, and `text` is what Vision text recognition read in it. Screenshots were
not kept: the sandbox stopped, and a contact sheet copied out of it failed its
checksum and was discarded.

## Sequence

- iOS 26.5 (iPhone 17) and iOS 18.6 (iPhone 16): build 21 (simulator build
  d182c9bd, before #152) installed first, small and medium widgets added, then
  this build installed over it (upgrade).
- iOS 26.5, AppEntity variant (the previous commit) first: choosing Dark left the
  medium widget light; the widget log read `Prepared appearance to
  AppearanceOption(nil)` with `serializedParameters appearance = {identifier =
  dark}`. The AppEnum of #152 had failed the same way on 2026-09-26.
- iOS 26.5, String variant: the log read `Prepared appearance to String(…)`.
- ios26-11/12 are one failed tap (the medium widget stayed Dark), retried as 13/14.
- iOS 16.4 (iPhone 14): the widget's long-press menu offered Edit Home Screen and
  Remove Widget only, no Edit Widget.

## Measurements

```
ios26-0-build21-syslight-medium: lum=233 text=[NEWSWORTHY | 4 | Interest on 30-year US government | bonds rose to about 5.6%, the | 110 | highest since 2002, which could | push up mortgage and loan costs. | Sep 30 • 5:04 PM]
ios26-0-build21-syslight-small: lum=240 text=[NEWSWORTHY | 4 | /10 | Sep 30 • 5:04 PM]
ios26-1-upgraded-syslight-medium: lum=227 text=[NEWSWORTHY | 4 | /10 | 1d ago: Interest on 30-year US | government bonds rose to about | 5.6%, the highest since 2002, which | could push up mortgage and loan... | Checked at 05:04]
ios26-1-upgraded-syslight-small: lum=235 text=[NEWSWORTHY | 4 | /10 | Checked at 05:04]
ios26-5-med-dark-syslight-medium (AppEntity, Dark chosen): lum=227 text=[NEWSWORTHY | 4 | /10 | 1d ago: Interest on 30-year US | government bonds rose to about | 5.6%, the highest since 2002, which | could push up mortgage and loan... | Checked at 05:04]
ios26-5-med-dark-syslight-small: lum=235 text=[NEWSWORTHY | 4 | /10 | Checked at 05:04]
ios26-7-string-med-dark-syslight-medium: lum=59 text=[NEWSWORTHY | /10 | 1d ago: Interest on 30-year US | government bonds rose to about | 5.6%, the highest since 2002, which | could push up mortgage and loan... | Checked at 05:04]
ios26-7-string-med-dark-syslight-small: lum=235 text=[NEWSWORTHY | 4 | /10 | Checked at 05:04]
ios26-9-small-light-nameoff-syslight-medium: lum=59 text=[NEWSWORTHY | /10 | 1d ago: Interest on 30-year US | government bonds rose to about | 5.6%, the highest since 2002, which | could push up mortgage and loan... | Checked at 05:04]
ios26-9-small-light-nameoff-syslight-small: lum=237 text=[4 | /10 | Checked at 05:04]
ios26-10-sysdark-medium: lum=58 text=[NEWSWORTHY | 4 | /10 | 1d ago: Interest on 30-year US | government bonds rose to about | 5.6%, the highest since 2002, which | could push up mortgage and loan... | Checked at 05:04]
ios26-10-sysdark-small: lum=236 text=[4 | /10 | Checked at 05:04]
ios26-11-medfollow-smallname-sysdark-medium: lum=58 text=[NEWSWORTHY | 4 | /10 | 1d ago: Interest on 30-year US | government bonds rose to about | 5.6%, the highest since 2002, which | could push up mortgage and loan... | Checked at 05:04]
ios26-11-medfollow-smallname-sysdark-small: lum=234 text=[NEWSWORTHY | 4 | /10 | Checked at 05:04]
ios26-12-medfollow-syslight-medium: lum=59 text=[NEWSWORTHY | /10 | 1d ago: Interest on 30-year US | government bonds rose to about | 5.6%, the highest since 2002, which | could push up mortgage and loan... | Checked at 05:04]
ios26-12-medfollow-syslight-small: lum=235 text=[NEWSWORTHY | 4 | /10 | Checked at 05:04]
ios26-13-medfollow-syslight-medium: lum=227 text=[NEWSWORTHY | 4 | /10 | 1d ago: Interest on 30-year US | government bonds rose to about | 5.6%, the highest since 2002, which | could push up mortgage and loan... | Checked at 05:04]
ios26-14-medfollow-sysdark-medium: lum=58 text=[NEWSWORTHY | 4 | /10 | 1d ago: Interest on 30-year US | government bonds rose to about | 5.6%, the highest since 2002, which | could push up mortgage and loan... | Checked at 05:04]
ios26-15-med-nameoff-sysdark-medium: lum=57 text=[4 | /10 | 1d ago: Interest on 30-year US | government bonds rose to about | 5.6%, the highest since 2002, which | could push up mortgage and loan | costs. | Checked at 05:04]
ios18-1-upgraded-syslight-medium: lum=225 text=[NEWSWORTHY | 4 | /10 | 1d ago: Interest on 30-year US | government bonds rose to about | 5.6%, the highest since 2002, | which could push up mortgage a... | Checked at 05:04]
ios18-1-upgraded-syslight-small: lum=235 text=[NEWSWORTHY | 4 | /10 | Checked at 05:04]
ios18-4-medlight-nameoff-sysdark-medium: lum=224 text=[-110 | 1d ago: Interest on 30-year US | government bonds rose to about | 5.6%, the highest since 2002, | which could push up mortgage and | loan costs. | Checked at 05:04]
ios18-4-medlight-nameoff-sysdark-small: lum=43 text=[NEWSWORTHY | Checked at 05:04]
ios18-6-smalldark-syslight-medium: lum=224 text=[-110 | 1d ago: Interest on 30-year US | government bonds rose to about | 5.6%, the highest since 2002, | which could push up mortgage and | loan costs. | Checked at 05:04]
ios18-6-smalldark-syslight-small: lum=43 text=[NEWSWORTHY | Checked at 05:04]
ios16-1-small: lum=234 text=[NEWSWORTHY | 4 | -/10 | Checked at 05:04]
```

## Not covered

- A physical device: these are simulators.
- On an upgraded widget whose Appearance was never set, the Edit Widget row
  shows the placeholder "Appearance" until opened; the widget follows the device.
- Android: no check ran (no KVM here, no hypervisor in the EAS sandbox).
