import Foundation
import ExpoModulesCore
import WidgetKit

public class NewsworthyWidgetsModule: Module {
    public func definition() -> ModuleDefinition {
        Name("NewsworthyWidgets")
        AsyncFunction("syncReading") { (apiBaseURL: String, payload: String) in
            guard let identifier = Bundle.main.bundleIdentifier,
                  let defaults = UserDefaults(suiteName: "group.\(identifier).widgets"),
                  let data = payload.data(using: .utf8),
                  let snapshot = try JSONSerialization.jsonObject(with: data) as? [String: Any],
                  let reading = snapshot["reading"] as? [String: Any],
                  let fetchedAt = snapshot["fetchedAt"] as? Double else { return }
            let key = "widget.reading.v1:\(apiBaseURL)"
            let previous = defaults.data(forKey: key).flatMap {
                (try? JSONSerialization.jsonObject(with: $0)) as? [String: Any]
            }
            if let previousTime = previous?["fetchedAt"] as? Double, previousTime > fetchedAt { return }
            defaults.set(data, forKey: key)
            // Also reload an unchanged reading: the widget may be showing an older
            // timeline or an offline label. The app only polls while foregrounded.
            WidgetCenter.shared.reloadTimelines(ofKind: "NewsworthyRating")
        }
    }
}
