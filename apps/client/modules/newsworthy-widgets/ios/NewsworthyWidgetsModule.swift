import Foundation
import ExpoModulesCore
import WidgetKit

public class NewsworthyWidgetsModule: Module {
    public func definition() -> ModuleDefinition {
        Name("NewsworthyWidgets")
        Function("getReadings") { (apiBaseURL: String) -> [String] in
            guard let identifier = Bundle.main.bundleIdentifier,
                  let defaults = UserDefaults(suiteName: "group.\(identifier).widgets") else { return [] }
            let key = "widget.reading.v1:\(apiBaseURL)"
            return [key, key + ":widget"].compactMap { name in
                defaults.data(forKey: name).flatMap { String(data: $0, encoding: .utf8) }
            }
        }
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
        // The widgets' own appearance, apart from the app's. Reload only on a
        // change: the app hands the choice over on every launch.
        AsyncFunction("setAppearance") { (appearance: String) in
            guard ["system", "light", "dark"].contains(appearance),
                  let identifier = Bundle.main.bundleIdentifier,
                  let defaults = UserDefaults(suiteName: "group.\(identifier).widgets") else { return }
            let key = "widget.appearance.v1"
            if defaults.string(forKey: key) == appearance { return }
            defaults.set(appearance, forKey: key)
            WidgetCenter.shared.reloadTimelines(ofKind: "NewsworthyRating")
        }
    }
}
