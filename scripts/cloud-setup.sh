#!/usr/bin/env bash
# Prepares a Claude Code cloud container for Newsworthy work. The environment's
# setup script runs it on every new session:
#
#   cd /home/user/newsworthy && bash scripts/cloud-setup.sh
#
# It installs what sessions otherwise fetch by hand: dependencies, the
# 1Password CLI (credentials come from the vault through OP_KEY, never from
# environment variables), eas-cli, and the Android SDK plus the jars
# scripts/check-android-widget.sh compiles against. Every step is idempotent,
# and a failed optional step warns rather than failing the session.
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TOOLS="${NEWSWORTHY_TOOLS:-/opt/newsworthy-tools}"
OP_VERSION=2.30.3
ANDROID_TOOLS=11076708
ANDROID_PLATFORM=android-35
ANDROID_BUILD_TOOLS=35.0.0
failures=()
# Maven Central rate-limits bursts (HTTP 429); retry with backoff.
fetch() { curl -fsSL --retry 5 --retry-delay 3 --retry-all-errors -o "$@"; }

step() {
  local name="$1"; shift
  echo "==> $name"
  if ! "$@"; then echo "!! $name failed; continuing" >&2; failures+=("$name"); fi
}

bin_dir() {
  if [ -w /usr/local/bin ]; then echo /usr/local/bin; else mkdir -p "$HOME/.local/bin"; echo "$HOME/.local/bin"; fi
}

install_dependencies() { (cd "$ROOT" && npm ci --no-audit --no-fund); }

install_op() {
  command -v op >/dev/null && op --version | grep -qx "$OP_VERSION" && return 0
  local tmp; tmp="$(mktemp -d)"
  fetch "$tmp/op.zip" "https://cache.agilebits.com/dist/1P/op2/pkg/v${OP_VERSION}/op_linux_amd64_v${OP_VERSION}.zip" \
    && unzip -qo "$tmp/op.zip" op -d "$(bin_dir)" && rm -rf "$tmp"
}

install_eas() { command -v eas >/dev/null || npm install -g eas-cli --no-audit --no-fund; }

install_android() {
  local sdk="$TOOLS/android-sdk"
  if [ ! -x "$sdk/cmdline-tools/latest/bin/sdkmanager" ]; then
    local tmp; tmp="$(mktemp -d)"
    fetch "$tmp/tools.zip" "https://dl.google.com/android/repository/commandlinetools-linux-${ANDROID_TOOLS}_latest.zip" || return 1
    unzip -q "$tmp/tools.zip" -d "$tmp" && mkdir -p "$sdk/cmdline-tools" && mv "$tmp/cmdline-tools" "$sdk/cmdline-tools/latest" && rm -rf "$tmp" || return 1
  fi
  [ -f "$sdk/platforms/$ANDROID_PLATFORM/android.jar" ] && [ -x "$sdk/build-tools/$ANDROID_BUILD_TOOLS/aapt2" ] && return 0
  # `yes` ends on a broken pipe, which pipefail would report as failure; the
  # installed files are the result that matters.
  (set +o pipefail; yes | "$sdk/cmdline-tools/latest/bin/sdkmanager" --sdk_root="$sdk" "platforms;$ANDROID_PLATFORM" "build-tools;$ANDROID_BUILD_TOOLS" >/dev/null 2>&1)
  [ -f "$sdk/platforms/$ANDROID_PLATFORM/android.jar" ] && [ -x "$sdk/build-tools/$ANDROID_BUILD_TOOLS/aapt2" ]
}

# The widget's Java imports WorkManager; javac also needs the Kotlin stdlib and
# the annotation and ListenableFuture jars it references. Versions match the
# widget plugin's Gradle dependencies.
install_android_jars() {
  local jars="$TOOLS/android-jars"; mkdir -p "$jars"
  [ -f "$jars/work.jar" ] || { fetch "$jars/work.aar" https://maven.google.com/androidx/work/work-runtime/2.11.2/work-runtime-2.11.2.aar \
    && unzip -qo "$jars/work.aar" classes.jar -d "$jars" && mv "$jars/classes.jar" "$jars/work.jar" && rm "$jars/work.aar"; } || return 1
  [ -f "$jars/annotation.jar" ] || fetch "$jars/annotation.jar" https://maven.google.com/androidx/annotation/annotation-jvm/1.9.1/annotation-jvm-1.9.1.jar || return 1
  [ -f "$jars/listenablefuture.jar" ] || fetch "$jars/listenablefuture.jar" https://repo1.maven.org/maven2/com/google/guava/listenablefuture/1.0/listenablefuture-1.0.jar || return 1
  [ -f "$jars/kotlin-stdlib.jar" ] || fetch "$jars/kotlin-stdlib.jar" https://repo1.maven.org/maven2/org/jetbrains/kotlin/kotlin-stdlib/2.1.0/kotlin-stdlib-2.1.0.jar
}

write_profile() {
  local line="export ANDROID_HOME=$TOOLS/android-sdk NEWSWORTHY_TOOLS=$TOOLS"
  if [ -w /etc/profile.d ]; then echo "$line" > /etc/profile.d/newsworthy.sh
  else grep -qxF "$line" "$HOME/.profile" 2>/dev/null || echo "$line" >> "$HOME/.profile"; fi
}

mkdir -p "$TOOLS" 2>/dev/null || { TOOLS="$HOME/.newsworthy-tools"; mkdir -p "$TOOLS"; }
step "npm dependencies" install_dependencies
step "1Password CLI $OP_VERSION" install_op
step "eas-cli" install_eas
step "Android SDK ($ANDROID_PLATFORM, build-tools $ANDROID_BUILD_TOOLS)" install_android
step "Android compile jars" install_android_jars
step "shell profile" write_profile

if [ -z "${OP_KEY:-}" ]; then echo "Note: OP_KEY is not set; the 1Password vault is unreachable in this session." >&2; fi
if [ ${#failures[@]} -gt 0 ]; then
  echo "Setup finished with failures: ${failures[*]}" >&2
  # Dependencies are the one step every session needs.
  [[ " ${failures[*]} " == *" npm dependencies "* ]] && exit 1
fi
echo "Newsworthy cloud setup complete."
