import WidgetKit
import SwiftUI
import Foundation
import AppIntents
import UIKit
import CoreText

struct ReadingEntry: TimelineEntry {
    let date: Date
    let reading: Reading?
    let saved: Bool
    var showAppName: Bool = true
    var appearance: WidgetAppearance = .system
}

/// The widget's own appearance, set beside "Show app name" when editing the
/// widget. Follow device leaves the colour scheme to the system, as before.
enum WidgetAppearance: String, CaseIterable, Sendable {
    case system, light, dark

    static let labels: [WidgetAppearance: LocalizedStringResource] = [
        .system: "Follow device", .light: "Light", .dark: "Dark",
    ]

    var colorScheme: ColorScheme? {
        switch self {
        case .system: return nil
        case .light: return .light
        case .dark: return .dark
        }
    }
}

/// Named colours resolve against the environment's scheme, so forcing it here
/// selects the light or dark entry of every colour set beneath.
struct ForcedColorScheme: ViewModifier {
    let scheme: ColorScheme?
    func body(content: Content) -> some View {
        if let scheme = scheme {
            content.environment(\.colorScheme, scheme)
        } else {
            content
        }
    }
}

@available(iOS 17.0, *)
struct ReadingWidgetConfiguration: WidgetConfigurationIntent {
    static var title: LocalizedStringResource = "Widget appearance"

    @Parameter(title: "Show app name", default: true)
    var showAppName: Bool

    @Parameter(title: "Appearance")
    var appearance: AppearanceOption?
}

/// Appearance is offered as an entity, not an AppEnum: iOS 26.5 hands a widget
/// an AppEnum parameter as nil (FB22848510), so a chosen Light or Dark followed
/// the device. Seen on the iOS 26.5 simulator on 2026-09-26; iOS 18.6 decoded it.
@available(iOS 17.0, *)
struct AppearanceOption: AppEntity {
    static var typeDisplayRepresentation: TypeDisplayRepresentation = "Appearance"
    static var defaultQuery = AppearanceOptionQuery()

    let value: WidgetAppearance
    var id: String { value.rawValue }
    var displayRepresentation: DisplayRepresentation { DisplayRepresentation(title: WidgetAppearance.labels[value]!) }
}

@available(iOS 17.0, *)
struct AppearanceOptionQuery: EntityQuery {
    func entities(for identifiers: [String]) async throws -> [AppearanceOption] {
        identifiers.compactMap(WidgetAppearance.init(rawValue:)).map(AppearanceOption.init(value:))
    }
    func suggestedEntities() async throws -> [AppearanceOption] {
        WidgetAppearance.allCases.map(AppearanceOption.init(value:))
    }
    func defaultResult() async -> AppearanceOption? { AppearanceOption(value: .system) }
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
                entry.appearance = configuration.appearance?.value ?? .system
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
                    entry.appearance = configuration.appearance?.value ?? .system
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
            let now = Date()
            // A second entry takes "New:" off at its two-hour mark even when the OS delays a refresh.
            let expiry = result.reading?.newLabelExpiry
            let dates = [now] + (expiry.map { $0 > now ? [$0] : [] } ?? [])
            let entries = dates.map { ReadingEntry(date: $0, reading: result.reading, saved: result.saved) }
            completion(Timeline(entries: entries, policy: .after(now.addingTimeInterval(30 * 60))))
        }
    }
}

/// A new development's sentence leads with a bold "New:"; everything else is plain.
func explanationText(_ reading: Reading?, at date: Date) -> Text {
    guard let parts = reading?.explanationParts(at: date) else { return Text(verbatim: "") }
    if parts.label.isEmpty { return Text(verbatim: parts.body) }
    return Text(verbatim: parts.label).bold() + Text(verbatim: " " + parts.body)
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

    // Cap height excludes curved-digit overshoot and the slash's lower stroke.
    // Use the same native font's actual outlines for visible-edge alignment.
    static func inkBounds(_ text: String, font: UIFont) -> CGRect {
        let line = CTLineCreateWithAttributedString(NSAttributedString(string: text, attributes: [.font: font]))
        return CTLineGetBoundsWithOptions(line, [.useGlyphPathBounds])
    }

    static func baselineLift(_ text: String, font: UIFont, scale: CGFloat) -> CGFloat {
        (-inkBounds(text, font: font).minY * scale).rounded() / scale
    }
}

// Align actual capital tops, using SwiftUI's measured baselines. A Text frame
// includes ascenders/leading; treating its top as the numeral top wastes space.
private struct WidgetReadingLayout: Layout {
    let compact: Bool
    let scoreInkHeight: CGFloat
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
        let contentHeight = max(scoreInkHeight, textHeight)
        let top = max(0, (bounds.height - contentHeight) / 2)
        number.place(at: CGPoint(x: bounds.minX, y: bounds.minY + top + scoreInkHeight - score[.firstTextBaseline]),
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
    @Environment(\.displayScale) private var displayScale
    @ScaledMetric(relativeTo: .caption) private var explanationSize = WidgetTypography.explanationSize
    @ScaledMetric(relativeTo: .caption) private var explanationLineHeight = WidgetTypography.explanationLineHeight

    private var numeral: String { entry.reading.map { String($0.score) } ?? "–" }
    private var sizingNumeral: String { entry.reading.map { String($0.score) } ?? "0" }

    // A very narrow/short host may need a smaller number, regardless of family.
    // Measure the two-digit case so readings never jump size when the score changes.
    private func scoreSize(in size: CGSize) -> CGFloat {
        let font = UIFont.monospacedSystemFont(ofSize: WidgetTypography.scoreSize, weight: .light)
        let bodyFont = UIFont.systemFont(ofSize: explanationSize)
        let targetCapHeight = bodyFont.capHeight + (WidgetTypography.numeralLines - 1) * explanationLineHeight
        let inkHeight = WidgetTypography.inkBounds(sizingNumeral, font: font).height
        let idealSize = WidgetTypography.scoreSize * targetCapHeight / inkHeight
        let fittedFont = UIFont.monospacedSystemFont(ofSize: idealSize, weight: .light)
        let width = ("10" as NSString).size(withAttributes: [.font: fittedFont]).width
        let denominator = ("∕10" as NSString).size(withAttributes: [.font: UIFont.monospacedSystemFont(ofSize: WidgetTypography.denominatorSize, weight: .light)]).width
        let scale = min(1, max(0.4, min(size.height / targetCapHeight, (size.width - denominator) / width)))
        return idealSize * scale
    }

    private func score(size: CGFloat) -> some View {
        let numberFont = UIFont.monospacedSystemFont(ofSize: size, weight: .light)
        let denominatorFont = UIFont.monospacedSystemFont(ofSize: WidgetTypography.denominatorSize, weight: .light)
        return (Text(numeral)
            .font(Font(numberFont))
            .tracking(-size * 0.04)
            .baselineOffset(WidgetTypography.baselineLift(numeral, font: numberFont, scale: displayScale))
         + Text("∕")
            .font(Font(denominatorFont))
            .tracking(0)
            .baselineOffset(WidgetTypography.baselineLift("∕", font: denominatorFont, scale: displayScale))
            .foregroundColor(Color("NewsworthyGradientMuted"))
         + Text("1")
            .font(Font(denominatorFont))
            .tracking(0)
            .baselineOffset(WidgetTypography.baselineLift("1", font: denominatorFont, scale: displayScale))
            .foregroundColor(Color("NewsworthyGradientMuted"))
         + Text("0")
            .font(Font(denominatorFont))
            .tracking(0)
            .baselineOffset(WidgetTypography.baselineLift("0", font: denominatorFont, scale: displayScale))
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
                WidgetReadingLayout(compact: family == .systemSmall,
                                    scoreInkHeight: WidgetTypography.inkBounds(sizingNumeral, font: scoreFont).height,
                                    explanationCapHeight: bodyFont.capHeight) {
                    score(size: size)
                    if family == .systemMedium {
                        explanationText(entry.reading, at: entry.date)
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
        .modifier(ForcedColorScheme(scheme: entry.appearance.colorScheme))
        .modifier(WidgetSurface(score: entry.reading?.score, scheme: entry.appearance.colorScheme))
        // WidgetKit extracts the container background separately. Replace the whole
        // surface when the score or appearance changes so its retained background changes too.
        .id("\(entry.reading?.score ?? 0)-\(entry.appearance.rawValue)")
    }
}

struct WidgetSurface: ViewModifier {
    let score: Int?
    var scheme: ColorScheme? = nil
    // The container background does not inherit the content's environment, so
    // the chosen scheme is applied to the gradient itself.
    private var background: some View {
        let prefix = score.map { String(format: "Level%02d", $0) } ?? "Brand"
        return LinearGradient(colors: [Color(prefix + "Start"), Color(prefix + "Center"), Color(prefix + "End")], startPoint: .topLeading, endPoint: .bottomTrailing)
            .modifier(ForcedColorScheme(scheme: scheme))
    }
    func body(content: Content) -> some View {
        if #available(iOS 17.0, *) {
            content.padding(16).containerBackground(for: .widget) { background }
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
        .description("The current news rating and when it was updated.")
        .supportedFamilies([.systemSmall, .systemMedium])
        .contentMarginsDisabled()
    }
}

// Keep the existing widget available on iOS 16, before App Intent configuration.
struct NewsworthyWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "NewsworthyRating", provider: Provider()) { entry in
            ReadingView(entry: entry)
        }
        .configurationDisplayName("Newsworthy")
        .description("The current news rating and when it was updated.")
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
