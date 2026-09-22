import SwiftUI
import WidgetKit
import UIKit

@main
struct WidgetMonoHost: App {
    var body: some Scene { WindowGroup { Gallery() } }
}
struct Gallery: View {
    @State private var score = 1
    let message = "A ceasefire agreement\nopens border crossings\nfor emergency supplies."
    func entry(_ value: Int) -> ReadingEntry {
        ReadingEntry(date: Date(), reading: Reading(score: value, explanation: message, created_at: "2026-09-22T08:00:00Z"), saved: false)
    }
    func widget(_ value: Int, _ family: WidgetFamily, _ width: CGFloat, dark: Bool) -> some View {
        ReadingContent(entry: entry(value), family: family)
            .padding(16)
            .frame(width: width, height: 170)
            .background {
                let prefix = String(format: "Level%02d", value)
                LinearGradient(colors: [Color(prefix + "Start"), Color(prefix + "Center"), Color(prefix + "End")], startPoint: .topLeading, endPoint: .bottomTrailing)
            }
            .clipShape(RoundedRectangle(cornerRadius: 22))
            .environment(\.colorScheme, dark ? .dark : .light)
    }
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 10) {
                Text("Widget fixes").font(.title2.bold())
                Text("Native iOS renderer · sample reading").font(.subheadline).foregroundStyle(.secondary)
                Text("Light · both sizes, same reading").font(.caption)
                HStack { widget(score, .systemSmall, 170, dark: false); Spacer() }
                widget(score, .systemMedium, 364, dark: false)
                Text("Dark · both sizes, same reading").font(.caption)
                HStack { widget(score, .systemSmall, 170, dark: true); Spacer() }
                widget(score, .systemMedium, 364, dark: true)
            }.padding(16)
        }
        .background(Color(uiColor: .systemGroupedBackground))
        .task {
            try? await Task.sleep(nanoseconds: 1_000_000_000)
            score = 3
            let font = UIFont.monospacedSystemFont(ofSize: 12, weight: .light)
            let wide = ("∕ 10" as NSString).size(withAttributes: [.font: font]).width
            let thin = ("∕ 10" as NSString).size(withAttributes: [.font: font]).width
            print("DENOMINATOR widths regular=\(wide), thin=\(thin)")
        }
    }
}
