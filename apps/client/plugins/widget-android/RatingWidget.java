package com.example.newsworthy;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import android.view.View;
import android.util.TypedValue;
import android.widget.RemoteViews;
import androidx.work.Constraints;
import androidx.work.ExistingPeriodicWorkPolicy;
import androidx.work.NetworkType;
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
            .setConstraints(new Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build()).build();
        WorkManager work = WorkManager.getInstance(context);
        work.enqueueUniquePeriodicWork(WORK, ExistingPeriodicWorkPolicy.KEEP, request);
        work.cancelUniqueWork(LEGACY_WORK);
    }

    static Date readingDate(JSONObject data) {
        String raw = data.optString("created_at");
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

    static boolean valid(JSONObject data) {
        Object score = data.opt("score");
        Object explanation = data.opt("explanation");
        if (!(score instanceof Number) || !(explanation instanceof String)) return false;
        double number = ((Number) score).doubleValue();
        String text = (String) explanation;
        return number >= 1 && number <= 10 && number == Math.floor(number)
            && !text.trim().isEmpty() && text.length() <= 2000 && readingDate(data) != null;
    }

    static void renderAll(Context context) {
        boolean saved = context.getSharedPreferences("newsworthy_widget", Context.MODE_PRIVATE).getBoolean(SAVED, true);
        JSONObject reading = null;
        try {
            JSONObject cached = new JSONObject(context.getSharedPreferences("newsworthy_widget", Context.MODE_PRIVATE).getString(CACHE, ""));
            if (valid(cached)) reading = cached;
        } catch (Exception ignored) { }
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
            float scoreSize = compact ? 52 : 44;
            RemoteViews views = new RemoteViews(context.getPackageName(), compact ? R.layout.rating_widget_compact : R.layout.rating_widget);
            views.setTextViewTextSize(R.id.widget_score, TypedValue.COMPLEX_UNIT_SP, scoreSize);
            views.setOnClickPendingIntent(R.id.widget_root, launch);
            views.setInt(R.id.widget_root, "setBackgroundResource",
                LevelPalette.background(reading == null ? 0 : reading.optInt("score")));
            if (reading != null) {
                String number = Integer.toString(reading.optInt("score"));
                // Keep the denominator in a separate, baseline-aligned TextView.
                // XML theme colors are resolved again when the host switches theme;
                // an inline ForegroundColorSpan retained the old theme's color.
                views.setTextViewText(R.id.widget_score, number);
                views.setContentDescription(R.id.widget_score, reading.optInt("score") + " out of 10");
                views.setTextViewText(R.id.widget_explanation, reading.optString("explanation"));
                String date = DateFormat.getDateTimeInstance(DateFormat.SHORT, DateFormat.SHORT).format(readingDate(reading));
                views.setTextViewText(R.id.widget_updated, (saved ? "Saved · " : "Updated ") + date);
            }
            views.setViewVisibility(R.id.widget_explanation, compact ? View.GONE : View.VISIBLE);
            manager.updateAppWidget(id, views);
        }
    }
}
