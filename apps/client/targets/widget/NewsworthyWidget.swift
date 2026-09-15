import WidgetKit
import SwiftUI
import Foundation
import AppIntents

struct Reading: Codable {
    let score: Int
    let explanation: String
    let created_at: String

    var updatedAt: Date? {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let date = formatter.date(from: created_at) { return date }
        formatter.formatOptions = [.withInternetDateTime]
        return formatter.date(from: created_at)
    }

    var isValid: Bool {
        (1...10).contains(score) && !explanation.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
            && explanation.count <= 2000 && updatedAt != nil
    }
}

struct ReadingEntry: TimelineEntry {
    let date: Date
    let reading: Reading?
    let saved: Bool
    var showAppName: Bool = true
}

@available(iOS 17.0, *)
struct ReadingWidgetConfiguration: WidgetConfigurationIntent {
    static var title: LocalizedStringResource = "Widget appearance"

    @Parameter(title: "Show app name", default: true)
    var showAppName: Bool
}

@available(iOS 17.0, *)
struct ConfigurableProvider: AppIntentTimelineProvider {
    func placeholder(in context: Context) -> ReadingEntry {
        Provider().placeholder(in: context)
    }

    func snapshot(for configuration: ReadingWidgetConfiguration, in context: Context) async -> ReadingEntry {
        await withCheckedContinuation { continuation in
            Provider().getSnapshot(in: context) { entry in
                var entry = entry
                entry.showAppName = configuration.showAppName
                continuation.resume(returning: entry)
            }
        }
    }

    func timeline(for configuration: ReadingWidgetConfiguration, in context: Context) async -> Timeline<ReadingEntry> {
        await withCheckedContinuation { continuation in
            Provider().getTimeline(in: context) { timeline in
                let entries = timeline.entries.map { entry in
                    var entry = entry
                    entry.showAppName = configuration.showAppName
                    return entry
                }
                continuation.resume(returning: Timeline(entries: entries, policy: timeline.policy))
            }
        }
    }
}

struct Provider: TimelineProvider {
    private var cacheKey: String { "widget.reading.v1:\(WidgetConfig.apiBaseURL)" }

    private func cached() -> Reading? {
        guard let data = UserDefaults.standard.data(forKey: cacheKey),
              let reading = try? JSONDecoder().decode(Reading.self, from: data), reading.isValid else { return nil }
        return reading
    }

    func placeholder(in context: Context) -> ReadingEntry {
        ReadingEntry(date: Date(), reading: nil, saved: false)
    }

    func getSnapshot(in context: Context, completion: @escaping (ReadingEntry) -> Void) {
        completion(ReadingEntry(date: Date(), reading: cached(), saved: true))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<ReadingEntry>) -> Void) {
        let fallback = cached()
        guard let url = URL(string: "\(WidgetConfig.apiBaseURL)/api/current") else {
            completion(timeline(reading: fallback, saved: true))
            return
        }
        var request = URLRequest(url: url, cachePolicy: .reloadIgnoringLocalCacheData, timeoutInterval: 15)
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        URLSession.shared.dataTask(with: request) { data, response, _ in
            guard let response = response as? HTTPURLResponse, response.statusCode == 200,
                  let data = data, data.count <= 65_536,
                  let reading = try? JSONDecoder().decode(Reading.self, from: data), reading.isValid else {
                completion(timeline(reading: fallback, saved: true))
                return
            }
            // Persist only public display fields; no shared app-group entitlement is needed.
            if let encoded = try? JSONEncoder().encode(reading) {
                UserDefaults.standard.set(encoded, forKey: cacheKey)
            }
            completion(timeline(reading: reading, saved: false))
        }.resume()
    }

    private func timeline(reading: Reading?, saved: Bool) -> Timeline<ReadingEntry> {
        Timeline(entries: [ReadingEntry(date: Date(), reading: reading, saved: saved)],
                 policy: .after(Date().addingTimeInterval(30 * 60)))
    }
}

struct ReadingView: View {
    let entry: ReadingEntry
    @Environment(\.widgetFamily) private var family
    private var scoreSize: CGFloat { family == .systemSmall ? 52 : 44 }

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            if entry.showAppName {
                Text("NEWSWORTHY").font(.caption2).tracking(2)
                    .lineLimit(1).minimumScaleFactor(0.8)
                    .foregroundStyle(Color("NewsworthyGradientMuted"))
            }
            if family == .systemSmall { Spacer(minLength: 0) }
            // Match the app's light digits, -0.04em tracking and baseline-aligned
            // denominator, including its leading space. Scale the whole run together.
            (Text(entry.reading.map { String($0.score) } ?? "–")
                .font(.system(size: scoreSize, weight: .light)).monospacedDigit()
                .tracking(-scoreSize * 0.04)
             + Text(" /10")
                .font(.system(size: 12, weight: .light)).monospacedDigit()
                .tracking(0)
                .foregroundColor(Color("NewsworthyGradientMuted")))
                .lineLimit(1).minimumScaleFactor(0.7)
                .accessibilityElement(children: .ignore)
                .accessibilityLabel(entry.reading.map { "\($0.score) out of 10" } ?? "Rating unavailable")
            if family == .systemMedium {
                Text(entry.reading?.explanation ?? "The latest rating will appear when a connection is available.")
                    .font(.caption).lineLimit(2)
            }
            Spacer(minLength: 0)
            if let date = entry.reading?.updatedAt {
                // An absolute date stays truthful even if the OS postpones the next update.
                Text("\(entry.saved ? "Saved · " : "")\(date.formatted(.dateTime.month(.abbreviated).day())) · \(date.formatted(date: .omitted, time: .shortened))")
                    .font(.caption2).foregroundStyle(Color("NewsworthyGradientMuted"))
                    .lineLimit(1).minimumScaleFactor(0.5)
                    .accessibilityLabel("\(entry.saved ? "Saved reading from" : "Updated") \(date.formatted(date: .abbreviated, time: .shortened))")
            } else {
                Text("Waiting for a reading").font(.caption2).foregroundStyle(Color("NewsworthyGradientMuted"))
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
        .foregroundStyle(Color("NewsworthyInk"))
        .modifier(WidgetSurface(score: entry.reading?.score))
    }
}

struct WidgetSurface: ViewModifier {
    let score: Int?
    private var background: LinearGradient {
        let prefix = score.map { String(format: "Level%02d", $0) } ?? "Brand"
        return LinearGradient(colors: [Color(prefix + "Start"), Color(prefix + "Center"), Color(prefix + "End")], startPoint: .topLeading, endPoint: .bottomTrailing)
    }
    func body(content: Content) -> some View {
        if #available(iOS 17.0, *) {
            content.containerBackground(for: .widget) { background }
        } else {
            content.padding().background(background)
        }
    }
}

@available(iOS 17.0, *)
struct ConfigurableNewsworthyWidget: Widget {
    var body: some WidgetConfiguration {
        AppIntentConfiguration(kind: "NewsworthyRating", intent: ReadingWidgetConfiguration.self, provider: ConfigurableProvider()) { entry in
            ReadingView(entry: entry)
        }
        .configurationDisplayName("Newsworthy")
        .description("A number out of 10. See the news rating and when it was updated.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

// Keep the existing widget available on iOS 16, before App Intent configuration.
struct NewsworthyWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "NewsworthyRating", provider: Provider()) { entry in
            ReadingView(entry: entry)
        }
        .configurationDisplayName("Newsworthy")
        .description("A number out of 10. See the news rating and when it was updated.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

@main
struct NewsworthyWidgets: WidgetBundle {
    var body: some Widget { widget() }

    private func widget() -> some Widget {
        if #available(iOS 17.0, *) {
            return ConfigurableNewsworthyWidget()
        }
        return NewsworthyWidget()
    }
}
