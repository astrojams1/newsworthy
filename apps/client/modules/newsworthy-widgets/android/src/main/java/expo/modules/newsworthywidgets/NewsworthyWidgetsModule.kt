package expo.modules.newsworthywidgets

import android.content.ComponentName
import android.content.Context
import android.content.Intent
import org.json.JSONObject
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class NewsworthyWidgetsModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("NewsworthyWidgets")
    Function("getReadings") { apiBaseURL: String ->
      val context = appContext.reactContext ?: return@Function emptyList<String>()
      val cache = context.getSharedPreferences("newsworthy_widget", Context.MODE_PRIVATE)
      val key = "rating:$apiBaseURL"
      val reading = cache.getString(key, null) ?: return@Function emptyList<String>()
      try {
        listOf(JSONObject().put("reading", JSONObject(reading))
          .put("fetchedAt", cache.getLong("$key:fetchedAt", 0)).toString())
      } catch (_: Exception) { emptyList<String>() }
    }
    AsyncFunction("syncReading") { apiBaseURL: String, payload: String ->
      val context = appContext.reactContext ?: return@AsyncFunction
      // Explicit, app-private receiver; no dependency from this library on app classes.
      val intent = Intent("${context.packageName}.SYNC_WIDGET_READING")
        .setComponent(ComponentName(context.packageName, "${context.packageName}.RatingWidget"))
        .putExtra("apiBaseURL", apiBaseURL)
        .putExtra("payload", payload)
      context.sendBroadcast(intent)
    }
    // The widgets' own appearance, apart from the app's; the widget stores it.
    AsyncFunction("setAppearance") { appearance: String ->
      val context = appContext.reactContext ?: return@AsyncFunction
      val intent = Intent("${context.packageName}.SET_WIDGET_APPEARANCE")
        .setComponent(ComponentName(context.packageName, "${context.packageName}.RatingWidget"))
        .putExtra("appearance", appearance)
      context.sendBroadcast(intent)
    }
  }
}
