import SwiftUI
import WidgetKit
import AppKit
@main struct Host {
  @MainActor static func main() {
    let out = CommandLine.arguments[1]
    let r = Reading(score: 4, explanation: "x", created_at: "2026-10-12T04:03:27Z",
      explanation_text: "Yemen's Houthi rebels said they struck Riyadh's main airport and a Saudi oil refinery on the Red Sea coast with drones and missiles.",
      explanation_new: false, explanation_at: "2026-10-06T01:04:30Z")
    let now = ISO8601DateFormatter().date(from: "2026-10-12T05:00:00Z")!
    let sizes: [(CGFloat, CGFloat)] = [(364,170),(338,158),(329,155),(348,157),(321,148)]
    let grid = VStack(alignment: .leading, spacing: 12) {
      ForEach(Array(sizes.enumerated()), id: \.offset) { _, s in
        HStack(alignment: .top, spacing: 12) {
          ForEach([true, false], id: \.self) { named in
            ReadingContent(entry: ReadingEntry(date: now, reading: r, saved: false, showAppName: named), family: .systemMedium)
              .frame(width: s.0, height: s.1)
              .background(Color(white: 0.93)).border(Color.gray)
              .overlay(alignment: .topTrailing) { Text("\(Int(s.0))×\(Int(s.1))").font(.system(size: 9)).padding(2) }
          }
        }
      }
    }.padding(12).background(Color.white).environment(\.colorScheme, .light)
    let ren = ImageRenderer(content: grid); ren.scale = 2
    let img = ren.nsImage!; let rep = NSBitmapImageRep(data: img.tiffRepresentation!)!
    try! rep.representation(using: .png, properties: [:])!.write(to: URL(fileURLWithPath: out))
  }
}
