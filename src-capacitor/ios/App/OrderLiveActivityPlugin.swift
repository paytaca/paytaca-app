import Foundation
import Capacitor
import ActivityKit

/// Bridges the shared `orderLiveActivityManager` service to ActivityKit.
///
/// Live Activities only exist from iOS 16.1, while the app still deploys to
/// iOS 13. Every entry point therefore guards on availability and degrades to
/// a no-op (`supported: false`) on older systems.
///
/// The plugin is intentionally stateless apart from the push-token observation
/// tasks: ActivityKit already lets us look activities up through
/// `Activity<OrderLiveActivityAttributes>.activities`, so there is no need to
/// retain them (and retaining them would leak across `end`).
@objc(OrderLiveActivityPlugin)
public class OrderLiveActivityPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "OrderLiveActivityPlugin"
    public let jsName = "OrderLiveActivity"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "isSupported", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "start", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "update", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "end", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "endAll", returnType: CAPPluginReturnPromise)
    ]

    /// activity id -> task observing `pushTokenUpdates` (iOS 16.2+).
    private var tokenTasks: [String: Task<Void, Never>] = [:]

    // MARK: - Support

    @objc func isSupported(_ call: CAPPluginCall) {
        guard #available(iOS 16.1, *) else {
            call.resolve(["supported": false, "platform": "ios", "version": 0])
            return
        }
        call.resolve([
            "supported": ActivityAuthorizationInfo().areActivitiesEnabled,
            "platform": "ios",
            "version": 16.1
        ])
    }

    // MARK: - Lifecycle

    @objc func start(_ call: CAPPluginCall) {
        guard #available(iOS 16.1, *) else {
            call.resolve(["id": NSNull()])
            return
        }
        guard let payload = call.getObject("activity"),
              let id = payload["id"] as? String else {
            call.reject("Must provide an 'activity' payload with an id")
            return
        }

        let state = contentState(from: payload)

        // Reuse an existing activity so a page reload does not stack duplicates.
        if let existing = findActivity(id: id) {
            Task {
                await existing.update(using: state)
                call.resolve(["id": id])
            }
            return
        }

        guard ActivityAuthorizationInfo().areActivitiesEnabled else {
            call.reject("Live activities are not enabled on this device")
            return
        }

        do {
            let activity = try Activity.request(
                attributes: attributes(from: payload),
                contentState: state,
                pushType: .token
            )
            observePushToken(of: activity)
            call.resolve(["id": activity.id])
        } catch {
            call.reject("Failed to start live activity: \(error.localizedDescription)")
        }
    }

    @objc func update(_ call: CAPPluginCall) {
        guard #available(iOS 16.1, *) else {
            call.resolve(["id": NSNull()])
            return
        }
        guard let payload = call.getObject("activity"),
              let id = payload["id"] as? String else {
            call.reject("Must provide an 'activity' payload with an id")
            return
        }

        // The activity was dismissed by the user (or expired): start a new one
        // rather than silently dropping the state.
        guard let activity = findActivity(id: id) else {
            start(call)
            return
        }

        let state = contentState(from: payload)
        Task {
            await activity.update(using: state)
            call.resolve(["id": id])
        }
    }

    @objc func end(_ call: CAPPluginCall) {
        guard #available(iOS 16.1, *) else {
            call.resolve()
            return
        }
        guard let id = call.getString("id") else {
            call.reject("Must provide an 'id'")
            return
        }

        let finalState = call.getObject("activity").map { contentState(from: $0) }
        cancelTokenTask(id: id)

        Task {
            if let activity = findActivity(id: id) {
                await activity.end(using: finalState, dismissalPolicy: .default)
            }
            call.resolve()
        }
    }

    @objc func endAll(_ call: CAPPluginCall) {
        guard #available(iOS 16.1, *) else {
            call.resolve()
            return
        }
        cancelAllTokenTasks()

        Task {
            for activity in Activity<OrderLiveActivityAttributes>.activities {
                await activity.end(using: nil, dismissalPolicy: .immediate)
            }
            call.resolve()
        }
    }

    // MARK: - Push tokens

    @available(iOS 16.1, *)
    private func observePushToken(of activity: Activity<OrderLiveActivityAttributes>) {
        if let token = activity.pushToken {
            emitPushToken(token, for: activity)
        }

        // `pushTokenUpdates` only exists from iOS 16.2.
        guard #available(iOS 16.2, *) else { return }

        let id = activity.attributes.id
        cancelTokenTask(id: id)
        tokenTasks[id] = Task { [weak self] in
            for await token in activity.pushTokenUpdates {
                if Task.isCancelled { break }
                self?.emitPushToken(token, for: activity)
            }
        }
    }

    @available(iOS 16.1, *)
    private func emitPushToken(_ token: Data, for activity: Activity<OrderLiveActivityAttributes>) {
        let hex = token.map { String(format: "%02x", $0) }.joined()
        notifyListeners("activityPushToken", data: [
            "token": hex,
            "activityId": activity.attributes.id,
            "kind": activity.attributes.kind,
            "orderId": activity.attributes.orderId
        ])
    }

    private func cancelTokenTask(id: String) {
        tokenTasks.removeValue(forKey: id)?.cancel()
    }

    private func cancelAllTokenTasks() {
        tokenTasks.values.forEach { $0.cancel() }
        tokenTasks.removeAll()
    }

    // MARK: - Payload mapping

    @available(iOS 16.1, *)
    private func findActivity(id: String) -> Activity<OrderLiveActivityAttributes>? {
        Activity<OrderLiveActivityAttributes>.activities.first { $0.attributes.id == id }
    }

    @available(iOS 16.1, *)
    private func attributes(from payload: JSObject) -> OrderLiveActivityAttributes {
        OrderLiveActivityAttributes(
            id: payload["id"] as? String ?? "",
            kind: payload["kind"] as? String ?? "",
            orderId: string(from: payload["orderId"]),
            title: payload["title"] as? String ?? "",
            subtitle: payload["subtitle"] as? String ?? "",
            deepLink: payload["deepLink"] as? String ?? ""
        )
    }

    @available(iOS 16.1, *)
    private func contentState(from payload: JSObject) -> OrderLiveActivityAttributes.ContentState {
        OrderLiveActivityAttributes.ContentState(
            statusCode: payload["statusCode"] as? String ?? "",
            statusLabel: payload["statusLabel"] as? String ?? "",
            stageIndex: int(from: payload["stageIndex"]),
            stageCount: int(from: payload["stageCount"]),
            progress: double(from: payload["progress"]),
            countdownAt: payload["countdownAt"] as? Double,
            countdownLabel: payload["countdownLabel"] as? String ?? "",
            isTerminal: bool(from: payload["isTerminal"]),
            terminalType: payload["terminalType"] as? String,
            updatedAt: double(from: payload["updatedAt"])
        )
    }

    private func int(from value: JSValue?) -> Int {
        if let number = value as? NSNumber { return number.intValue }
        return 0
    }

    private func bool(from value: JSValue?) -> Bool {
        if let bool = value as? Bool { return bool }
        if let number = value as? NSNumber { return number.boolValue }
        return false
    }

    private func double(from value: JSValue?) -> Double {
        if let number = value as? NSNumber { return number.doubleValue }
        return 0
    }

    private func string(from value: JSValue?) -> String {
        if let string = value as? String { return string }
        if let number = value as? NSNumber { return number.stringValue }
        return ""
    }
}
