import WidgetKit
import SwiftUI
import Foundation

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

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("NEWSWORTHY").font(.caption2).tracking(2).foregroundStyle(Color("NewsworthyGradientMuted"))
            HStack(alignment: .firstTextBaseline, spacing: 2) {
                Text(entry.reading.map { String($0.score) } ?? "–")
                    .font(.system(size: family == .systemSmall ? 52 : 44, weight: .light)).minimumScaleFactor(0.7)
                Text("/10").font(.caption).foregroundStyle(Color("NewsworthyGradientMuted"))
            }.accessibilityElement(children: .ignore)
                .accessibilityLabel(entry.reading.map { "\($0.score) out of 10" } ?? "Rating unavailable")
            if family == .systemMedium {
                Text(entry.reading?.explanation ?? "The latest rating will appear when a connection is available.")
                    .font(.caption).lineLimit(2)
            }
            Spacer(minLength: 0)
            if let date = entry.reading?.updatedAt {
                // An absolute date stays truthful even if the OS postpones the next update.
                Text("\(entry.saved ? "Saved · " : "Updated ")\(date.formatted(.dateTime.month(.abbreviated).day().hour().minute()))")
                    .font(.caption2).foregroundStyle(Color("NewsworthyGradientMuted")).lineLimit(2)
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
        if #available(iOSApplicationExtension 17.0, *) {
            content.containerBackground(for: .widget) { background }
        } else {
            content.padding().background(background)
        }
    }
}

@main
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
