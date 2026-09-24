package com.example.newsworthy;

import android.content.Context;
import androidx.annotation.NonNull;
import androidx.work.Worker;
import androidx.work.WorkerParameters;
import org.json.JSONObject;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;

public class RatingWidgetWorker extends Worker {
    public RatingWidgetWorker(@NonNull Context context, @NonNull WorkerParameters params) { super(context, params); }

    @NonNull @Override public Result doWork() {
        RatingWidget.renderAll(getApplicationContext()); // Advance cached age even while offline.
        HttpURLConnection connection = null;
        JSONObject display = null;
        long fetchedAt = System.currentTimeMillis();
        long revision = getApplicationContext().getSharedPreferences("newsworthy_widget", Context.MODE_PRIVATE)
            .getLong(RatingWidget.REVISION, 0);
        try {
            connection = (HttpURLConnection) new URL(BuildConfig.NEWSWORTHY_API_URL + "/api/current").openConnection();
            connection.setConnectTimeout(10_000);
            connection.setReadTimeout(10_000);
            connection.setUseCaches(false);
            connection.setInstanceFollowRedirects(false);
            connection.setRequestProperty("Accept", "application/json");
            if (connection.getResponseCode() != 200) throw new Exception("Reading unavailable");
            ByteArrayOutputStream output = new ByteArrayOutputStream();
            try (InputStream stream = connection.getInputStream()) {
                byte[] buffer = new byte[4096];
                int size;
                while ((size = stream.read(buffer)) != -1) {
                    if (isStopped() || output.size() + size > 65_536) throw new Exception("Reading too large or work stopped");
                    output.write(buffer, 0, size);
                }
            }
            JSONObject data = new JSONObject(output.toString(StandardCharsets.UTF_8.name()));
            if (!RatingWidget.valid(data)) throw new Exception("Invalid reading");
            display = new JSONObject().put("score", data.getInt("score"))
                .put("explanation", data.getString("explanation")).put("created_at", data.getString("created_at"));
            if (data.opt("explanation_text") instanceof String) {
                display.put("explanation_text", data.getString("explanation_text"))
                    .put("explanation_since", data.opt("explanation_since"))
                    .put("explanation_new", data.optBoolean("explanation_new", false));
            }

        } catch (Exception ignored) {
            // Preserve the original reading and timestamp; the next scheduled update retries.
        } finally {
            if (connection != null) connection.disconnect();
        }
        RatingWidget.completeRefresh(getApplicationContext(), display, revision, fetchedAt);
        return Result.success();
    }
}
