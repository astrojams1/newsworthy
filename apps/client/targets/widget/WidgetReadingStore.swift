import Foundation

struct Reading: Codable, Equatable, Sendable {
    let score: Int
    let explanation: String
    let created_at: String
    var explanation_text: String? = nil
    var explanation_since: String? = nil
    var explanation_new: Bool? = nil

    var updatedAt: Date? {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let date = formatter.date(from: created_at) { return date }
        formatter.formatOptions = [.withInternetDateTime]
        return formatter.date(from: created_at)
    }

    func displayedExplanation(at now: Date) -> String {
        var prefix = ""
        if explanation_text != nil, explanation_new == true {
            prefix = "New: "
        } else if explanation_text != nil, let raw = explanation_since {
            let formatter = ISO8601DateFormatter()
            formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
            var start = formatter.date(from: raw)
            if start == nil { formatter.formatOptions = [.withInternetDateTime]; start = formatter.date(from: raw) }
            if let start, start <= now {
                let minutes = Int(now.timeIntervalSince(start) / 60)
                if minutes < 1 { prefix = "Just now: " }
                else {
                    let (value, unit): (Int, String) = minutes < 60 ? (minutes, "minute")
                        : minutes < 2880 ? (minutes / 60, "hour")
                        : minutes < 525600 ? (minutes / 1440, "day") : (minutes / 525600, "year")
                    prefix = "\(value) \(unit)\(value == 1 ? "" : "s") ago: "
                }
            }
        }
        let body = explanation_text ?? explanation
        let limit = 140 - prefix.unicodeScalars.count
        if body.unicodeScalars.count <= limit { return prefix + body }
        var cut = String(String.UnicodeScalarView(body.unicodeScalars.prefix(limit - 1)))
        if let space = cut.lastIndex(of: " "), cut[..<space].unicodeScalars.count > limit / 2 {
            cut = String(cut[..<space])
        }
        return prefix + cut.trimmingCharacters(in: .whitespacesAndNewlines) + "…"
    }

    var isValid: Bool {
        (1...10).contains(score) && !explanation.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
            && explanation.count <= 2000 && updatedAt != nil
    }
}

struct AppReading: Codable, Equatable, Sendable {
    let reading: Reading
    let fetchedAt: Double

    var isValid: Bool { reading.isValid && fetchedAt.isFinite && fetchedAt >= 0 }

    static func newest(_ current: AppReading?, _ candidate: AppReading?) -> AppReading? {
        guard let candidate = candidate, candidate.isValid else { return current }
        guard let current = current, current.isValid else { return candidate }
        let difference = candidate.reading.updatedAt!.timeIntervalSince(current.reading.updatedAt!)
        return difference > 0 || (difference == 0 && candidate.fetchedAt > current.fetchedAt) ? candidate : current
    }
}

struct WidgetRefresh: Sendable {
    let reading: Reading?
    let saved: Bool
}

// All families/configurations use one request and one accepted snapshot. Keep
// app and extension writes separate so neither process can erase the other.
actor WidgetReadingStore {
    private let apiBaseURL: String
    private let shared: UserDefaults?
    private let local: UserDefaults
    private let fetch: @Sendable (String) async throws -> Reading
    private let now: @Sendable () -> Double
    private let onChange: @Sendable () -> Void
    private var inFlight: Task<WidgetRefresh, Never>?
    private var memory: AppReading?
    private var cacheKey: String { "widget.reading.v1:\(apiBaseURL)" }

    init(apiBaseURL: String, sharedSuite: String, localSuite: String? = nil,
         fetch: @escaping @Sendable (String) async throws -> Reading = { try await WidgetReadingStore.fetchReading($0) },
         now: @escaping @Sendable () -> Double = { Date().timeIntervalSince1970 * 1000 },
         onChange: @escaping @Sendable () -> Void) {
        self.apiBaseURL = apiBaseURL
        self.shared = UserDefaults(suiteName: sharedSuite)
        self.local = localSuite.flatMap { UserDefaults(suiteName: $0) } ?? .standard
        self.fetch = fetch
        self.now = now
        self.onChange = onChange
    }

    func cached() -> AppReading? {
        var result = memory
        // Migrate the pre-shared-cache extension snapshot without discarding it.
        if let data = local.data(forKey: cacheKey),
           let reading = try? JSONDecoder().decode(Reading.self, from: data) {
            result = AppReading.newest(result, AppReading(reading: reading, fetchedAt: local.double(forKey: cacheKey + ":fetchedAt")))
        }
        for key in [cacheKey, cacheKey + ":widget"] {
            if let data = shared?.data(forKey: key),
               let snapshot = try? JSONDecoder().decode(AppReading.self, from: data) {
                result = AppReading.newest(result, snapshot)
            }
        }
        return result
    }

    func refresh() async -> WidgetRefresh {
        if let inFlight = inFlight { return await inFlight.value }
        // Sibling reloads consume the published snapshot without starting another
        // fetch/reload loop, including after the extension process restarts.
        let age = cached().map { now() - $0.fetchedAt }
        if let age = age, age >= 0, age < 60_000 {
            return WidgetRefresh(reading: cached()?.reading, saved: false)
        }
        let task = Task { await self.performRefresh() }
        inFlight = task
        let result = await task.value
        inFlight = nil
        return result
    }

    private func performRefresh() async -> WidgetRefresh {
        let startedAt = now()
        do {
            let reading = try await fetch(apiBaseURL)
            guard reading.isValid else { throw URLError(.cannotParseResponse) }
            // Re-read both writers after the await. Message time wins first;
            // request time breaks ties when the same message's score decays.
            let previous = cached()
            let candidate = AppReading(reading: reading, fetchedAt: startedAt)
            let accepted = AppReading.newest(previous, candidate)!
            if accepted == candidate {
                memory = accepted
                if let encoded = try? JSONEncoder().encode(accepted) {
                    shared?.set(encoded, forKey: cacheKey + ":widget")
                }
                if previous?.reading != accepted.reading { onChange() }
            }
            return WidgetRefresh(reading: accepted.reading, saved: false)
        } catch {
            return WidgetRefresh(reading: cached()?.reading, saved: true)
        }
    }

    static func fetchReading(_ apiBaseURL: String) async throws -> Reading {
        guard let url = URL(string: "\(apiBaseURL)/api/current") else { throw URLError(.badURL) }
        var request = URLRequest(url: url, cachePolicy: .reloadIgnoringLocalCacheData, timeoutInterval: 15)
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        let (data, response) = try await URLSession.shared.data(for: request)
        guard let response = response as? HTTPURLResponse, response.statusCode == 200,
              data.count <= 65_536 else { throw URLError(.badServerResponse) }
        let reading = try JSONDecoder().decode(Reading.self, from: data)
        guard reading.isValid else { throw URLError(.cannotParseResponse) }
        return reading
    }
}
