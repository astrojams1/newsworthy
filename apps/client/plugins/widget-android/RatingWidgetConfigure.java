package com.example.newsworthy;

import android.app.Activity;
import android.appwidget.AppWidgetManager;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.view.View;
import android.view.accessibility.AccessibilityNodeInfo;
import android.widget.RadioButton;
import android.widget.Switch;

/**
 * The widget's own settings, opened by the launcher when a widget is added or
 * reconfigured: Android's counterpart of iOS's Edit Widget. The settings and
 * their labels are defined once, for both platforms, in
 * design/widget-settings.json; test/widget-settings.test.js holds this screen,
 * RatingWidget and the iOS configuration intent to that definition.
 */
public class RatingWidgetConfigure extends Activity {
    static final String[] APPEARANCES = {"system", "light", "dark"};

    private int id = AppWidgetManager.INVALID_APPWIDGET_ID;
    private boolean showAppName;
    private String appearance;

    @Override protected void onCreate(Bundle state) {
        super.onCreate(state);
        Bundle extras = getIntent().getExtras();
        if (extras != null) id = extras.getInt(AppWidgetManager.EXTRA_APPWIDGET_ID, AppWidgetManager.INVALID_APPWIDGET_ID);
        if (id == AppWidgetManager.INVALID_APPWIDGET_ID) { finish(); return; }
        // Leaving without Done keeps the widget as it was. On Android 11 and
        // earlier a cancelled result would remove a widget being added, so the
        // result is OK from the start and Done only adds the saved choices.
        setResult(RESULT_OK, new Intent().putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, id));
        SharedPreferences cache = getSharedPreferences("newsworthy_widget", Context.MODE_PRIVATE);
        showAppName = RatingWidget.showAppName(cache, id);
        appearance = RatingWidget.appearance(cache, id);
        setContentView(R.layout.rating_widget_configure);

        findViewById(R.id.widget_settings_close).setOnClickListener(view -> finish());
        findViewById(R.id.widget_settings_done).setOnClickListener(view -> {
            RatingWidget.saveSettings(this, id, showAppName, appearance);
            finish();
        });

        Switch toggle = findViewById(R.id.widget_setting_show_app_name_switch);
        View toggleRow = findViewById(R.id.widget_setting_show_app_name);
        toggle.setChecked(showAppName);
        toggleRow.setOnClickListener(view -> {
            showAppName = !showAppName;
            toggle.setChecked(showAppName);
            toggleRow.sendAccessibilityEvent(android.view.accessibility.AccessibilityEvent.TYPE_VIEW_CLICKED);
        });
        // The row is the control, as in the app: announced as a switch with its state.
        toggleRow.setAccessibilityDelegate(new View.AccessibilityDelegate() {
            @Override public void onInitializeAccessibilityNodeInfo(View host, AccessibilityNodeInfo info) {
                super.onInitializeAccessibilityNodeInfo(host, info);
                info.setClassName(Switch.class.getName());
                info.setCheckable(true);
                info.setChecked(showAppName);
            }
        });

        for (String value : APPEARANCES) {
            View row = findViewById(choiceRow(value));
            row.setOnClickListener(view -> { appearance = value; renderChoices(); });
            row.setAccessibilityDelegate(new View.AccessibilityDelegate() {
                @Override public void onInitializeAccessibilityNodeInfo(View host, AccessibilityNodeInfo info) {
                    super.onInitializeAccessibilityNodeInfo(host, info);
                    info.setClassName(RadioButton.class.getName());
                    info.setCheckable(true);
                    info.setChecked(value.equals(appearance));
                }
            });
        }
        renderChoices();
    }

    static int choiceRow(String value) {
        switch (value) {
            case "light": return R.id.widget_setting_appearance_light;
            case "dark": return R.id.widget_setting_appearance_dark;
            default: return R.id.widget_setting_appearance_system;
        }
    }

    static int choiceCheck(String value) {
        switch (value) {
            case "light": return R.id.widget_setting_appearance_light_check;
            case "dark": return R.id.widget_setting_appearance_dark_check;
            default: return R.id.widget_setting_appearance_system_check;
        }
    }

    // One check, on the chosen row, as the app's Appearance page marks it.
    private void renderChoices() {
        for (String value : APPEARANCES) {
            findViewById(choiceCheck(value)).setVisibility(value.equals(appearance) ? View.VISIBLE : View.INVISIBLE);
        }
    }
}
