import Foundation
import ActivityKit

/// Shared ActivityKit definition for order live activities.
///
/// This file is compiled into BOTH the App target and the
/// `OrderLiveActivityWidget` extension target, so the attributes and content
/// state stay in sync between the process that starts/updates an activity and
/// the process that renders it.
///
/// The payload is deliberately masked: it only carries the section/storefront
/// title, an order reference, the current status and a countdown deadline.
/// Amounts and counterparty names are never sent to the lock screen.
@available(iOS 16.1, *)
struct OrderLiveActivityAttributes: ActivityAttributes {
    struct ContentState: Codable, Hashable {
        /// Raw backend status code, e.g. `ESCRW` or `preparing`.
        var statusCode: String
        /// Human readable status, e.g. "In escrow".
        var statusLabel: String
        /// 1-based stage within the order lifecycle, 0 when unknown.
        var stageIndex: Int
        /// Total number of stages for this order kind.
        var stageCount: Int
        /// Progress fraction between 0 and 1.
        var progress: Double
        /// Deadline as epoch milliseconds, nil when there is no countdown.
        var countdownAt: Double?
        /// Label for the countdown, e.g. "Expires in".
        var countdownLabel: String
        /// Whether the order has reached a final state.
        var isTerminal: Bool
        /// `success`, `failed`, `cancelled` or nil while the order is active.
        var terminalType: String?
        /// Epoch milliseconds of the last update, used to break ties.
        var updatedAt: Double
    }

    /// Stable identifier (`<kind>:<orderId>`).
    var id: String
    /// `p2p` or `marketplace`.
    var kind: String
    /// Backend order id.
    var orderId: String
    /// Lock-screen safe section title (storefront name or "P2P Ramp").
    var title: String
    /// Lock-screen safe subtitle (order reference + trade type).
    var subtitle: String
    /// Deep link opened when the user taps the activity.
    var deepLink: String
}
