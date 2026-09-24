import Foundation

// Run against the production actor, with deterministic time/network/storage.
actor Network {
    var calls = 0
    var pending: CheckedContinuation<Reading, Error>?
    func fetch() async throws -> Reading {
        calls += 1
        return try await withCheckedThrowingContinuation { pending = $0 }
    }
    func finish(_ reading: Reading?) {
        if let reading = reading { pending?.resume(returning: reading) }
        else { pending?.resume(throwing: URLError(.notConnectedToInternet)) }
        pending = nil
    }
    func waitForRequest() async {
        while pending == nil { await Task.yield() }
    }
}
final class Clock: @unchecked Sendable {
    var time: Double = 100_000
    var reloads = 0
}
@main
struct StoreTests {
    static func main() async throws {
        let origin = ISO8601DateFormatter().date(from: "2026-09-16T18:05:00Z")!
        var fresh = Reading(score: 7, explanation: "Unlabelled server copy.", created_at: "2026-09-16T18:05:00.000Z",
                            explanation_text: "The Fed raised rates a quarter point.", explanation_new: true)
        precondition(fresh.displayedExplanation(at: origin.addingTimeInterval(60)) == "New: The Fed raised rates a quarter point.")
        precondition(fresh.explanationParts(at: origin.addingTimeInterval(119 * 60)).label == "New:")
        precondition(fresh.displayedExplanation(at: origin.addingTimeInterval(2 * 3600)) == "The Fed raised rates a quarter point.",
                     "New: comes off at two hours")
        precondition(fresh.newLabelExpiry == origin.addingTimeInterval(2 * 3600))
        var rereport = fresh
        rereport.explanation_new = false
        precondition(rereport.displayedExplanation(at: origin) == "The Fed raised rates a quarter point." && rereport.newLabelExpiry == nil)
        fresh.explanation_text = String(repeating: "😀 ", count: 200)
        let fitted = fresh.displayedExplanation(at: origin)
        precondition(fitted.hasPrefix("New: ") && fitted.unicodeScalars.count <= 140 && fitted.hasSuffix("…"))
        let roundTrip = try JSONDecoder().decode(Reading.self, from: JSONEncoder().encode(fresh))
        precondition(roundTrip == fresh)
        // A build before this change cached explanation_since; it decodes and shows no label.
        let aged = try JSONDecoder().decode(Reading.self, from: Data(#"{"score":1,"explanation":"Old.","created_at":"2026-09-18T00:05:00Z","explanation_text":"Old.","explanation_since":"2026-09-16T18:05:00Z"}"#.utf8))
        precondition(aged.displayedExplanation(at: origin) == "Old.")
        let legacy = try JSONDecoder().decode(Reading.self, from: Data(#"{"score":1,"explanation":"Legacy sentence.","created_at":"2026-09-18T00:05:00Z"}"#.utf8))
        precondition(legacy.displayedExplanation(at: origin) == "Legacy sentence.")
        let suite = "newsworthy.store.test.\(UUID().uuidString)"
        let shared = UserDefaults(suiteName: suite)!
        let local = UserDefaults(suiteName: suite + ".legacy")!
        defer {
            shared.removePersistentDomain(forName: suite)
            local.removePersistentDomain(forName: suite + ".legacy")
        }
        let key = "widget.reading.v1:https://example.test"
        let old = Reading(score: 1, explanation: "Earlier message", created_at: "2026-09-22T01:00:00Z")
        let newer = Reading(score: 3, explanation: "Later message", created_at: "2026-09-22T02:00:00Z")
        let clock = Clock(), network = Network()
        let store = WidgetReadingStore(apiBaseURL: "https://example.test", sharedSuite: suite, localSuite: suite + ".legacy",
            fetch: { _ in try await network.fetch() }, now: { clock.time }, onChange: { clock.reloads += 1 })
        local.set(try JSONEncoder().encode(old), forKey: key)
        local.set(1.0, forKey: key + ":fetchedAt")
        let migrated = await store.cached()
        precondition(migrated?.reading == old, "Legacy snapshots remain available")

        // Two widget sizes and appearance configurations share one in-flight fetch.
        let small = Task { await store.refresh() }
        await network.waitForRequest()
        let medium = Task { await store.refresh() }
        await network.finish(newer)
        let first = await small.value, second = await medium.value
        let calls = await network.calls
        precondition(first.reading == newer && second.reading == newer && calls == 1)
        precondition(clock.reloads == 1, "One changed message reloads sibling instances once")
        let sibling = await store.refresh()
        let afterSibling = await network.calls
        precondition(sibling.reading == newer && afterSibling == 1 && clock.reloads == 1)

        // Fresh snapshots survive process restarts and do not create reload loops.
        let restarted = WidgetReadingStore(apiBaseURL: "https://example.test", sharedSuite: suite, localSuite: suite + ".legacy",
            fetch: { _ in preconditionFailure("fresh shared data should not fetch") }, now: { clock.time }, onChange: {})
        let restart = await restarted.refresh()
        precondition(restart.reading == newer)

        // A more recently fetched older message cannot roll back a newer message.
        clock.time += 61_000
        let stale = Task { await store.refresh() }
        await network.waitForRequest()
        await network.finish(old)
        let staleResult = await stale.value
        precondition(staleResult.reading == newer && clock.reloads == 1)

        // Same message can decay; its palette and number must both use this score.
        let decayed = Reading(score: 2, explanation: newer.explanation, created_at: newer.created_at)
        let decay = Task { await store.refresh() }
        await network.waitForRequest()
        await network.finish(decayed)
        let decayResult = await decay.value
        precondition(decayResult.reading == decayed && clock.reloads == 2)

        // An app refresh during a pending widget request wins, even offline.
        clock.time += 61_000
        let app = Reading(score: 4, explanation: "Newest app message", created_at: "2026-09-22T03:00:00Z")
        let pending = Task { await store.refresh() }
        await network.waitForRequest()
        shared.set(try JSONEncoder().encode(AppReading(reading: app, fetchedAt: clock.time + 1)), forKey: key)
        await network.finish(newer)
        let pendingResult = await pending.value
        precondition(pendingResult.reading == app && clock.reloads == 2)
        clock.time += 61_000
        let offline = Task { await store.refresh() }
        await network.waitForRequest()
        await network.finish(nil)
        let offlineResult = await offline.value
        precondition(offlineResult.saved && offlineResult.reading == app)

        // Invalid snapshots must not hide valid app/legacy data.
        shared.set(Data("{broken".utf8), forKey: key + ":widget")
        let valid = await store.cached()
        precondition(valid?.reading == app)
        let negative = AppReading(reading: newer, fetchedAt: -1)
        precondition(AppReading.newest(nil, negative) == nil)
        print("Passed: coalesced sizes, sibling reload, restart, stale response, decay, concurrent app refresh, offline and invalid cache")
    }
}
