package com.example.newsworthy;

import android.text.SpannableString;
import android.text.Spanned;
import android.text.style.StyleSpan;
import android.app.PendingIntent;
import android.graphics.Paint;
import android.graphics.Rect;
import android.graphics.Typeface;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import android.view.View;
import android.util.TypedValue;
import android.widget.RemoteViews;
import androidx.work.ExistingPeriodicWorkPolicy;
import androidx.work.PeriodicWorkRequest;
import java.util.concurrent.TimeUnit;
import androidx.work.WorkManager;
import org.json.JSONObject;
import java.text.DateFormat;
import java.text.ParsePosition;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;
import java.util.TimeZone;

public class RatingWidget extends AppWidgetProvider {
    static final String CACHE = "rating:" + BuildConfig.NEWSWORTHY_API_URL;
    private static final String LEGACY_WORK = "newsworthy-widget-refresh";
    private static final String WORK = "newsworthy-widget-periodic-refresh";
    static final String SAVED = CACHE + ":saved";

    static final String REVISION = CACHE + ":revision";
    static final String FETCHED_AT = CACHE + ":fetchedAt";
    // The appearance chosen for widgets in the app, apart from the app's own.
    static final String APPEARANCE = "appearance";

    @Override public void onReceive(Context context, Intent intent) {
        if ((context.getPackageName() + ".SYNC_WIDGET_READING").equals(intent.getAction())) {
            if (!BuildConfig.NEWSWORTHY_API_URL.equals(intent.getStringExtra("apiBaseURL"))) return;
            try {
                JSONObject snapshot = new JSONObject(intent.getStringExtra("payload"));
                JSONObject reading = snapshot.getJSONObject("reading");
                if (valid(reading)) {
                    acceptAppReading(context, reading, snapshot.getLong("fetchedAt"));
                    refresh(context);
                }
            } catch (Exception ignored) { }
            return;
        }
        if ((context.getPackageName() + ".SET_WIDGET_APPEARANCE").equals(intent.getAction())) {
            setAppearance(context, intent.getStringExtra("appearance"));
            return;
        }
        super.onReceive(context, intent);
    }

    private static boolean olderThanCache(android.content.SharedPreferences cache, JSONObject reading, long fetchedAt) {
        try {
            JSONObject previous = new JSONObject(cache.getString(CACHE, ""));
            if (!valid(previous)) return false;
            int order = readingDate(reading).compareTo(readingDate(previous));
            return order < 0 || (order == 0 && cache.getLong(FETCHED_AT, 0) > fetchedAt);
        } catch (Exception ignored) { return false; }
    }

    private static synchronized void acceptAppReading(Context context, JSONObject reading, long fetchedAt) {
        android.content.SharedPreferences cache = context.getSharedPreferences("newsworthy_widget", Context.MODE_PRIVATE);
        if (olderThanCache(cache, reading, fetchedAt)) return;
        cache.edit().putString(CACHE, reading.toString()).putBoolean(SAVED, false)
            .putLong(FETCHED_AT, fetchedAt)
            .putLong(REVISION, cache.getLong(REVISION, 0) + 1).apply();
        renderAll(context);
    }

    // A worker started before the app refresh must not replace it or mark it saved.
    static synchronized void completeRefresh(Context context, JSONObject reading, long revision, long fetchedAt) {
        android.content.SharedPreferences cache = context.getSharedPreferences("newsworthy_widget", Context.MODE_PRIVATE);
        if (cache.getLong(REVISION, 0) != revision || (reading != null && olderThanCache(cache, reading, fetchedAt))) return;
        android.content.SharedPreferences.Editor edit = cache.edit().putBoolean(SAVED, reading == null);
        if (reading != null) edit.putString(CACHE, reading.toString()).putLong(FETCHED_AT, fetchedAt);
        edit.apply();
        renderAll(context);
    }

    // The app hands the choice over on every launch; only a change re-renders.
    static synchronized void setAppearance(Context context, String appearance) {
        if (!"system".equals(appearance) && !"light".equals(appearance) && !"dark".equals(appearance)) return;
        android.content.SharedPreferences cache = context.getSharedPreferences("newsworthy_widget", Context.MODE_PRIVATE);
        if (appearance.equals(cache.getString(APPEARANCE, "system"))) return;
        cache.edit().putString(APPEARANCE, appearance).apply();
        renderAll(context);
    }

    /** True or false for a chosen Dark or Light; null when widgets follow the device. */
    static Boolean chosenDark(android.content.SharedPreferences cache) {
        String appearance = cache.getString(APPEARANCE, "system");
        return "dark".equals(appearance) ? Boolean.TRUE : "light".equals(appearance) ? Boolean.FALSE : null;
    }

    // Following the device keeps every colour an XML theme resource, which the
    // host re-resolves when its theme changes. A chosen appearance must hold
    // through that change, so only then are the colours literal values.
    static void applyChosenAppearance(RemoteViews views, int score, boolean dark) {
        int ink = dark ? LevelPalette.INK_DARK : LevelPalette.INK_LIGHT;
        int muted = dark ? LevelPalette.MUTED_DARK : LevelPalette.MUTED_LIGHT;
        views.setInt(R.id.widget_root, "setBackgroundResource", LevelPalette.background(score, dark));
        views.setTextColor(R.id.widget_name, muted);
        views.setTextColor(R.id.widget_score, ink);
        views.setTextColor(R.id.widget_denominator, muted);
        views.setTextColor(R.id.widget_explanation, ink);
        views.setTextColor(R.id.widget_updated, muted);
    }

    @Override public void onUpdate(Context context, AppWidgetManager manager, int[] ids) {
        renderAll(context);
        refresh(context);
    }

    @Override public void onAppWidgetOptionsChanged(Context context, AppWidgetManager manager, int id, Bundle options) {
        renderAll(context);
    }

    @Override public void onDisabled(Context context) {
        WorkManager.getInstance(context).cancelUniqueWork(WORK);
        WorkManager.getInstance(context).cancelUniqueWork(LEGACY_WORK);
    }

    public static void refresh(Context context) {
        int[] ids = AppWidgetManager.getInstance(context).getAppWidgetIds(new ComponentName(context, RatingWidget.class));
        if (ids.length == 0) return;
        // One persistent job keeps WorkManager's receiver enabled between runs.
        // Chaining one-time jobs from onUpdate caused PACKAGE_CHANGED -> onUpdate
        // -> refresh loops that recreated the launcher widget every second.
        PeriodicWorkRequest request = new PeriodicWorkRequest.Builder(RatingWidgetWorker.class, 30, TimeUnit.MINUTES)
            .build();
        WorkManager work = WorkManager.getInstance(context);
        work.enqueueUniquePeriodicWork(WORK, ExistingPeriodicWorkPolicy.UPDATE, request);
        work.cancelUniqueWork(LEGACY_WORK);
    }

    static Date readingDate(JSONObject data) {
        return parseDate(data.optString("created_at"));
    }

    static Date parseDate(String raw) {
        for (String pattern : new String[]{"yyyy-MM-dd'T'HH:mm:ss.SSSXXX", "yyyy-MM-dd'T'HH:mm:ssXXX"}) {
            SimpleDateFormat format = new SimpleDateFormat(pattern, Locale.US);
            format.setTimeZone(TimeZone.getTimeZone("UTC"));
            format.setLenient(false);
            ParsePosition position = new ParsePosition(0);
            Date date = format.parse(raw, position);
            if (date != null && position.getIndex() == raw.length()) return date;
        }
        return null;
    }

    static final String NEW_LABEL = "New:";
    static final long NEW_LABEL_MS = 2 * 3_600_000L;

    /** A sentence that opened its own development is new for two hours after its reading was saved. */
    static boolean isNew(JSONObject reading, long now) {
        if (!(reading.opt("explanation_text") instanceof String) || !reading.optBoolean("explanation_new", false)) return false;
        Date saved = readingDate(reading);
        return saved != null && now - saved.getTime() < NEW_LABEL_MS;
    }

    /** "New:" in bold before a new development's sentence; the body fitted so both stay within 140 characters. */
    static CharSequence displayedExplanation(JSONObject reading, long now) {
        boolean hasBody = reading.opt("explanation_text") instanceof String;
        String label = isNew(reading, now) ? NEW_LABEL : "";
        String body = reading.optString(hasBody ? "explanation_text" : "explanation", "");
        int limit = 140 - (label.isEmpty() ? 0 : label.length() + 1);
        if (body.codePointCount(0, body.length()) > limit) {
            String cut = body.substring(0, body.offsetByCodePoints(0, limit - 1));
            int space = cut.lastIndexOf(' ');
            if (space >= 0 && cut.codePointCount(0, space) > limit / 2) cut = cut.substring(0, space);
            body = cut.trim() + "…";
        }
        if (label.isEmpty()) return body;
        SpannableString text = new SpannableString(label + " " + body);
        // Weight only: a color span kept the old theme's color after a theme switch.
        text.setSpan(new StyleSpan(Typeface.BOLD), 0, label.length(), Spanned.SPAN_EXCLUSIVE_EXCLUSIVE);
        return text;
    }

    static boolean valid(JSONObject data) {
        Object score = data.opt("score");
        Object explanation = data.opt("explanation");
        if (!(score instanceof Number) || !(explanation instanceof String)) return false;
        double number = ((Number) score).doubleValue();
        String text = (String) explanation;
        return number >= 1 && number <= 10 && number == Math.floor(number)
            && !text.trim().isEmpty() && text.length() <= 2000 && readingDate(data) != null;
    }

    // Both families share a base numeral. Only host constraints shrink it; score
    // changes never do. Keep native TextViews so theme resources remain adaptive.
    static void applyTypography(Context context, RemoteViews views, int width, int height, boolean compact, float scoreSize) {
        android.util.DisplayMetrics display = context.getResources().getDisplayMetrics();
        float density = display.density;
        Paint number = new Paint(Paint.ANTI_ALIAS_FLAG);
        number.setTypeface(Typeface.create("monospace", Typeface.NORMAL));
        number.setTextSize(scoreSize * density);
        Paint text = new Paint(Paint.ANTI_ALIAS_FLAG);
        text.setTypeface(Typeface.create("sans-serif", Typeface.NORMAL));
        text.setTextSize(TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_SP, 14, display));
        Rect numberInk = new Rect(), textInk = new Rect();
        number.getTextBounds("0", 0, 1, numberInk);
        text.getTextBounds("H", 0, 1, textInk);
        int lineHeight = Math.round(TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_SP, 20, display));
        // Capital tops align; the number's baseline lands on sentence line three.
        float targetCapHeight = -textInk.top + 2 * lineHeight;
        number.setTextSize(number.getTextSize() * targetCapHeight / -numberInk.top);
        Paint denominator = new Paint(number);
        denominator.setTextSize(12 * density);
        float availableHeight = Math.max(24, height - 74) * density;
        float availableWidth = Math.max(36, width - 24 - (compact ? 0 : 112)) * density;
        float fit = Math.min(1, Math.min(availableHeight / number.getFontSpacing(),
            (availableWidth - denominator.measureText("∕10") - 2 * density) / number.measureText("10")));
        number.setTextSize(number.getTextSize() * Math.max(0.4f, fit));
        views.setTextViewTextSize(R.id.widget_score, TypedValue.COMPLEX_UNIT_PX, number.getTextSize());
        views.setTextViewTextSize(R.id.widget_denominator, TypedValue.COMPLEX_UNIT_PX, denominator.getTextSize());
        if (!compact) {
            number.getTextBounds("0", 0, 1, numberInk);
            text.getTextBounds("H", 0, 1, textInk);
            int top = Math.max(0, Math.round((-number.ascent() + numberInk.top) - (-text.ascent() + textInk.top)));
            views.setViewPadding(R.id.widget_explanation, 0, top, 0, 0);
            views.setInt(R.id.widget_explanation, "setLineHeight", lineHeight);
            views.setInt(R.id.widget_explanation, "setMaxLines", Math.max(1, Math.min(4, (int)((availableHeight - top) / lineHeight))));
        }
    }

    static synchronized void renderAll(Context context) {
        JSONObject reading = null;
        android.content.SharedPreferences cache = context.getSharedPreferences("newsworthy_widget", Context.MODE_PRIVATE);
        try {
            JSONObject cached = new JSONObject(cache.getString(CACHE, ""));
            if (valid(cached)) reading = cached;
        } catch (Exception ignored) { }
        Boolean dark = chosenDark(cache);
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        Intent open = new Intent(context, MainActivity.class);
        open.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent launch = PendingIntent.getActivity(context, 0, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        for (int id : manager.getAppWidgetIds(new ComponentName(context, RatingWidget.class))) {
            Bundle options = manager.getAppWidgetOptions(id);
            // A narrow square shows the score; a wider/taller widget adds context.
            // Height alone left typical two-row launcher cells stuck in expanded mode.
            int width = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH);
            int height = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT);
            boolean compact = width < 250 || height < 150;
            float scoreSize = 69;
            RemoteViews views = new RemoteViews(context.getPackageName(), compact ? R.layout.rating_widget_compact : R.layout.rating_widget);
            applyTypography(context, views, width, height, compact, scoreSize);
            views.setOnClickPendingIntent(R.id.widget_root, launch);
            views.setInt(R.id.widget_root, "setBackgroundResource",
                LevelPalette.background(reading == null ? 0 : reading.optInt("score")));
            if (dark != null) applyChosenAppearance(views, reading == null ? 0 : reading.optInt("score"), dark);
            if (reading != null) {
                String number = Integer.toString(reading.optInt("score"));
                // Keep the denominator in a separate, baseline-aligned TextView.
                // XML theme colors are resolved again when the host switches theme;
                // an inline ForegroundColorSpan retained the old theme's color.
                views.setTextViewText(R.id.widget_score, number);
                views.setContentDescription(R.id.widget_score, reading.optInt("score") + " out of 10");
                views.setTextViewText(R.id.widget_explanation, displayedExplanation(reading, System.currentTimeMillis()));
                String date = DateFormat.getDateTimeInstance(DateFormat.SHORT, DateFormat.SHORT).format(readingDate(reading));
                views.setTextViewText(R.id.widget_updated, "Updated " + date);
            }
            views.setViewVisibility(R.id.widget_explanation, compact ? View.GONE : View.VISIBLE);
            manager.updateAppWidget(id, views);
        }
    }
}
