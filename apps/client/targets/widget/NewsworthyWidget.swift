import WidgetKit
import SwiftUI
import Foundation
import AppIntents
import UIKit

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

struct AppReading: Codable {
    let reading: Reading
    let fetchedAt: Double
}

struct Provider: TimelineProvider {
    private var cacheKey: String { "widget.reading.v1:\(WidgetConfig.apiBaseURL)" }

    private func appReading() -> AppReading? {
        guard let data = UserDefaults(suiteName: WidgetConfig.appGroup)?.data(forKey: cacheKey),
              let snapshot = try? JSONDecoder().decode(AppReading.self, from: data),
              snapshot.reading.isValid, snapshot.fetchedAt.isFinite else { return nil }
        return snapshot
    }

    private func cached() -> Reading? {
        if let app = appReading(), app.fetchedAt >= UserDefaults.standard.double(forKey: cacheKey + ":fetchedAt") {
            return app.reading
        }
        return locallyCached()
    }

    private func locallyCached() -> Reading? {
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
        let startedAt = Date().timeIntervalSince1970 * 1000
        // An app-triggered reload can use the just-fetched reading even offline.
        if let app = appReading(), startedAt - app.fetchedAt < 60_000,
           app.fetchedAt >= UserDefaults.standard.double(forKey: cacheKey + ":fetchedAt") {
            completion(timeline(reading: app.reading, saved: false))
            return
        }
        guard let url = URL(string: "\(WidgetConfig.apiBaseURL)/api/current") else {
            completion(timeline(reading: cached(), saved: true))
            return
        }
        var request = URLRequest(url: url, cachePolicy: .reloadIgnoringLocalCacheData, timeoutInterval: 15)
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        URLSession.shared.dataTask(with: request) { data, response, _ in
            guard let response = response as? HTTPURLResponse, response.statusCode == 200,
                  let data = data, data.count <= 65_536,
                  let reading = try? JSONDecoder().decode(Reading.self, from: data), reading.isValid else {
                completion(timeline(reading: cached(), saved: true))
                return
            }
            // A request already in flight must not undo a later app refresh.
            if let app = appReading(), app.fetchedAt > startedAt {
                completion(timeline(reading: app.reading, saved: false))
                return
            }
            // Each process owns its shared key, so concurrent writes cannot erase
            // the other process's newer snapshot. The app reads both on opening.
            if let encoded = try? JSONEncoder().encode(reading) {
                UserDefaults.standard.set(encoded, forKey: cacheKey)
                UserDefaults.standard.set(startedAt, forKey: cacheKey + ":fetchedAt")
            }
            if let encoded = try? JSONEncoder().encode(AppReading(reading: reading, fetchedAt: startedAt)) {
                UserDefaults(suiteName: WidgetConfig.appGroup)?.set(encoded, forKey: cacheKey + ":widget")
            }
            completion(timeline(reading: reading, saved: false))
        }.resume()
    }

    private func timeline(reading: Reading?, saved: Bool) -> Timeline<ReadingEntry> {
        Timeline(entries: [ReadingEntry(date: Date(), reading: reading, saved: saved)],
                 policy: .after(Date().addingTimeInterval(30 * 60)))
    }
}

// One three-line numeral size for both families. The description can grow with
// Dynamic Type independently; the already-large score remains legible and stable.
private enum WidgetTypography {
    static let scoreSize: CGFloat = 69
    static let explanationSize: CGFloat = 14
    static let explanationLineHeight: CGFloat = 20
    static let denominatorSize: CGFloat = 12
    static let columnGap: CGFloat = 16
}

// Align actual capital tops, using SwiftUI's measured baselines. A Text frame
// includes ascenders/leading; treating its top as the numeral top wastes space.
private struct WidgetReadingLayout: Layout {
    let compact: Bool
    let scoreCapHeight: CGFloat
    let explanationCapHeight: CGFloat

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        proposal.replacingUnspecifiedDimensions(by: CGSize(width: 332, height: 92))
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        guard let number = subviews.first else { return }
        let score = number.dimensions(in: .unspecified)
        let width = max(0, bounds.width - score.width - WidgetTypography.columnGap)
        let textProposal = ProposedViewSize(width: width, height: bounds.height)
        let text = !compact && subviews.count > 1 ? subviews[1].dimensions(in: textProposal) : nil
        let textHeight = text.map { $0.height - $0[.firstTextBaseline] + explanationCapHeight } ?? 0
        let contentHeight = max(scoreCapHeight, textHeight)
        let top = max(0, (bounds.height - contentHeight) / 2)
        number.place(at: CGPoint(x: bounds.minX, y: bounds.minY + top + scoreCapHeight - score[.firstTextBaseline]),
                     anchor: .topLeading, proposal: .unspecified)
        if let text = text {
            subviews[1].place(at: CGPoint(x: bounds.minX + score.width + WidgetTypography.columnGap,
                                        y: bounds.minY + top + explanationCapHeight - text[.firstTextBaseline]),
                              anchor: .topLeading, proposal: textProposal)
        }
    }
}

struct ReadingView: View {
    let entry: ReadingEntry
    @Environment(\.widgetFamily) private var family
    var body: some View { ReadingContent(entry: entry, family: family) }
}

// Explicit family makes the production content testable in a native host.
struct ReadingContent: View {
    let entry: ReadingEntry
    let family: WidgetFamily
    @ScaledMetric(relativeTo: .caption) private var explanationSize = WidgetTypography.explanationSize
    @ScaledMetric(relativeTo: .caption) private var explanationLineHeight = WidgetTypography.explanationLineHeight

    // A very narrow/short host may need a smaller number, regardless of family.
    // Measure the two-digit case so readings never jump size when the score changes.
    private func scoreSize(in size: CGSize) -> CGFloat {
        let font = UIFont.monospacedDigitSystemFont(ofSize: WidgetTypography.scoreSize, weight: .light)
        let width = ("10" as NSString).size(withAttributes: [.font: font]).width
        let denominator = (" ∕ 10" as NSString).size(withAttributes: [.font: UIFont.systemFont(ofSize: WidgetTypography.denominatorSize, weight: .light)]).width
        let scale = min(1, max(0.4, min(size.height / font.capHeight, (size.width - denominator) / width)))
        return WidgetTypography.scoreSize * scale
    }

    private func score(size: CGFloat) -> some View {
        (Text(entry.reading.map { String($0.score) } ?? "–")
            .font(.system(size: size, weight: .light)).monospacedDigit()
            .tracking(-size * 0.04)
         + Text(" ∕ 10")
            .font(.system(size: WidgetTypography.denominatorSize, weight: .light)).monospacedDigit()
            .tracking(0)
            .foregroundColor(Color("NewsworthyGradientMuted")))
            .lineLimit(1).fixedSize()
            .accessibilityElement(children: .ignore)
            .accessibilityLabel(entry.reading.map { "\($0.score) out of 10" } ?? "Rating unavailable")
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            if entry.showAppName {
                Text("NEWSWORTHY").font(.system(size: 10)).tracking(2)
                    .lineLimit(1).minimumScaleFactor(0.8)
                    .foregroundStyle(Color("NewsworthyGradientMuted"))
                    .frame(height: 14, alignment: .leading)
            }
            GeometryReader { geometry in
                let size = scoreSize(in: geometry.size)
                let scoreFont = UIFont.monospacedDigitSystemFont(ofSize: size, weight: .light)
                let bodyFont = UIFont.systemFont(ofSize: explanationSize)
                WidgetReadingLayout(compact: family == .systemSmall, scoreCapHeight: scoreFont.capHeight,
                                    explanationCapHeight: bodyFont.capHeight) {
                    score(size: size)
                    if family == .systemMedium {
                        Text(entry.reading?.explanation ?? "")
                            .font(.system(size: explanationSize))
                            .lineSpacing(max(0, explanationLineHeight - bodyFont.lineHeight))
                            .lineLimit(max(1, Int(geometry.size.height / explanationLineHeight)))
                            .truncationMode(.tail)
                            .multilineTextAlignment(.leading)
                    }
                }
                .clipped()
            }
            Group {
                if let date = entry.reading?.updatedAt {
                    // Preserve the saved reading's absolute timestamp.
                    Text("\(date.formatted(.dateTime.month(.abbreviated).day())) · \(date.formatted(date: .omitted, time: .shortened))")
                        .accessibilityLabel("Updated \(date.formatted(date: .abbreviated, time: .shortened))")
                } else {
                    Text("")
                }
            }
            .font(.system(size: 11)).foregroundStyle(Color("NewsworthyGradientMuted"))
            .lineLimit(1).minimumScaleFactor(0.5)
            .frame(height: 16, alignment: .leading)
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
