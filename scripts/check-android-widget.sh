#!/usr/bin/env bash
# Compiles the Android widget without a Gradle build: links its resources with
# aapt2 at the app's minimum SDK, then compiles every widget Java class against
# the platform and WorkManager. Catches resource, API-level and Java errors in
# seconds; it does not run anything, so it is not device verification.
# Tools come from scripts/cloud-setup.sh.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TOOLS="${NEWSWORTHY_TOOLS:-/opt/newsworthy-tools}"
SDK="${ANDROID_HOME:-$TOOLS/android-sdk}"
JARS="$TOOLS/android-jars"
PLATFORM="$SDK/platforms/android-35/android.jar"
AAPT2="$SDK/build-tools/35.0.0/aapt2"
WIDGET="$ROOT/apps/client/plugins/widget-android"
MIN_SDK=24

for file in "$PLATFORM" "$AAPT2" "$JARS/work.jar"; do
  [ -e "$file" ] || { echo "Missing $file; run scripts/cloud-setup.sh first." >&2; exit 2; }
done

BUILD="$(mktemp -d)"; trap 'rm -rf "$BUILD"' EXIT
PKG=com/example/newsworthy
mkdir -p "$BUILD/gen" "$BUILD/classes" "$BUILD/stub/$PKG"
# The manifest entries the widget plugin adds, enough for aapt2 to resolve them.
cat > "$BUILD/AndroidManifest.xml" <<'EOF'
<manifest xmlns:android="http://schemas.android.com/apk/res/android" package="com.example.newsworthy">
  <application>
    <activity android:name=".RatingWidgetConfigure" android:exported="true" android:theme="@style/WidgetSettingsTheme" android:label="@string/widget_settings_title">
      <intent-filter><action android:name="android.appwidget.action.APPWIDGET_CONFIGURE"/></intent-filter>
    </activity>
    <receiver android:name=".RatingWidget" android:exported="false"><meta-data android:name="android.appwidget.provider" android:resource="@xml/rating_widget_info"/></receiver>
  </application>
</manifest>
EOF
# Classes the app generates or owns, which the widget only refers to.
echo 'package com.example.newsworthy; public final class BuildConfig { public static final String NEWSWORTHY_API_URL = "https://example.test"; }' > "$BUILD/stub/$PKG/BuildConfig.java"
echo 'package com.example.newsworthy; public class MainActivity extends android.app.Activity {}' > "$BUILD/stub/$PKG/MainActivity.java"

"$AAPT2" compile --dir "$WIDGET/res" -o "$BUILD/res.zip"
"$AAPT2" link -I "$PLATFORM" --manifest "$BUILD/AndroidManifest.xml" --min-sdk-version "$MIN_SDK" --target-sdk-version 35 \
  --java "$BUILD/gen" -o "$BUILD/widget.apk" "$BUILD/res.zip"
javac -nowarn -Xlint:-options -source 11 -target 11 -d "$BUILD/classes" \
  -cp "$PLATFORM:$JARS/work.jar:$JARS/annotation.jar:$JARS/listenablefuture.jar:$JARS/kotlin-stdlib.jar" \
  "$BUILD/gen/$PKG/R.java" "$BUILD/stub/$PKG/"*.java "$WIDGET/"*.java 2>&1 | grep -v '^Picked up JAVA_TOOL_OPTIONS' || true
[ -f "$BUILD/classes/$PKG/RatingWidget.class" ] || { echo "Android widget did not compile." >&2; exit 1; }
echo "Android widget resources linked (minSdk $MIN_SDK) and $(ls "$WIDGET"/*.java | wc -l) Java classes compiled."
