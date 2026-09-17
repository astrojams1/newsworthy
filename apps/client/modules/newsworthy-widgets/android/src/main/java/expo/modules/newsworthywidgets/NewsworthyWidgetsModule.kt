package expo.modules.newsworthywidgets

import android.content.ComponentName
import android.content.Intent
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class NewsworthyWidgetsModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("NewsworthyWidgets")
    AsyncFunction("syncReading") { apiBaseURL: String, payload: String ->
      val context = appContext.reactContext ?: return@AsyncFunction
      // Explicit, app-private receiver; no dependency from this library on app classes.
      val intent = Intent("${context.packageName}.SYNC_WIDGET_READING")
        .setComponent(ComponentName(context.packageName, "${context.packageName}.RatingWidget"))
        .putExtra("apiBaseURL", apiBaseURL)
        .putExtra("payload", payload)
      context.sendBroadcast(intent)
    }
  }
}
