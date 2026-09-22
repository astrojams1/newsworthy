import WidgetKit
import SwiftUI
import Foundation
import AppIntents
import UIKit

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
    private static let store = WidgetReadingStore(
        apiBaseURL: WidgetConfig.apiBaseURL,
        sharedSuite: WidgetConfig.appGroup,
        onChange: { WidgetCenter.shared.reloadTimelines(ofKind: "NewsworthyRating") }
    )

    func placeholder(in context: Context) -> ReadingEntry {
        ReadingEntry(date: Date(), reading: nil, saved: false)
    }

    func getSnapshot(in context: Context, completion: @escaping (ReadingEntry) -> Void) {
        Task {
            let snapshot = await Self.store.cached()
            completion(ReadingEntry(date: Date(), reading: snapshot?.reading, saved: true))
        }
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<ReadingEntry>) -> Void) {
        Task {
            let result = await Self.store.refresh()
            completion(Timeline(entries: [ReadingEntry(date: Date(), reading: result.reading, saved: result.saved)],
                                policy: .after(Date().addingTimeInterval(30 * 60))))
        }
    }
}

// One three-line numeral size for both families. The description can grow with
// Dynamic Type independently; the already-large score remains legible and stable.
private enum WidgetTypography {
    static let scoreSize: CGFloat = 69
    static let numeralLines: CGFloat = 3
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
        let font = UIFont.monospacedSystemFont(ofSize: WidgetTypography.scoreSize, weight: .light)
        let bodyFont = UIFont.systemFont(ofSize: explanationSize)
        let targetCapHeight = bodyFont.capHeight + (WidgetTypography.numeralLines - 1) * explanationLineHeight
        let idealSize = WidgetTypography.scoreSize * targetCapHeight / font.capHeight
        let fittedFont = UIFont.monospacedSystemFont(ofSize: idealSize, weight: .light)
        let width = ("10" as NSString).size(withAttributes: [.font: fittedFont]).width
        let denominator = (" ∕10" as NSString).size(withAttributes: [.font: UIFont.monospacedSystemFont(ofSize: WidgetTypography.denominatorSize, weight: .light)]).width
        let scale = min(1, max(0.4, min(size.height / targetCapHeight, (size.width - denominator) / width)))
        return idealSize * scale
    }

    private func score(size: CGFloat) -> some View {
        (Text(entry.reading.map { String($0.score) } ?? "–")
            .font(.system(size: size, weight: .light, design: .monospaced))
            .tracking(-size * 0.04)
         + Text(" ∕10")
            .font(.system(size: WidgetTypography.denominatorSize, weight: .light, design: .monospaced))
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
                let scoreFont = UIFont.monospacedSystemFont(ofSize: size, weight: .light)
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
        // WidgetKit extracts the container background separately. Replace the whole
        // surface when the score changes so its retained background changes too.
        .id(entry.reading?.score)
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
