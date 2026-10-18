import ActivityKit
import SwiftUI
import WidgetKit

private let brandBlue = Color(red: 0.26, green: 0.65, blue: 0.96)

@main
struct OrderLiveActivityWidgetBundle: WidgetBundle {
    var body: some Widget {
        OrderLiveActivityWidget()
    }
}

/// Lock screen + Dynamic Island presentation for an order live activity.
///
/// Everything rendered here is masked: a section/storefront title, the order
/// reference, the current status, a progress bar and a countdown. Amounts and
/// counterparty names are intentionally absent so nothing sensitive leaks onto
/// the lock screen.
struct OrderLiveActivityWidget: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: OrderLiveActivityAttributes.self) { context in
            OrderLiveActivityLockScreenView(context: context)
                .activityBackgroundTint(Color(red: 0.07, green: 0.08, blue: 0.10))
                .activitySystemActionForegroundColor(.white)
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    Image(systemName: orderIcon(for: context.state))
                        .font(.title3)
                        .foregroundStyle(orderTint(for: context.state))
                        .padding(.leading, 4)
                }
                DynamicIslandExpandedRegion(.trailing) {
                    CountdownView(state: context.state, compact: false)
                        .padding(.trailing, 4)
                }
                DynamicIslandExpandedRegion(.center) {
                    VStack(alignment: .leading, spacing: 1) {
                        Text(context.attributes.title)
                            .font(.caption)
                            .fontWeight(.semibold)
                            .lineLimit(1)
                        Text(context.attributes.subtitle)
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                            .lineLimit(1)
                    }
                }
                DynamicIslandExpandedRegion(.bottom) {
                    VStack(alignment: .leading, spacing: 6) {
                        Text(context.state.statusLabel)
                            .font(.caption2)
                            .fontWeight(.semibold)
                            .foregroundStyle(orderTint(for: context.state))
                            .lineLimit(1)
                        OrderProgressView(state: context.state)
                    }
                    .padding(.horizontal, 4)
                }
            } compactLeading: {
                Image(systemName: orderIcon(for: context.state))
                    .foregroundStyle(orderTint(for: context.state))
            } compactTrailing: {
                CountdownView(state: context.state, compact: true)
            } minimal: {
                Image(systemName: orderIcon(for: context.state))
                    .foregroundStyle(orderTint(for: context.state))
            }
            .widgetURL(URL(string: context.attributes.deepLink))
            .keylineTint(orderTint(for: context.state))
        }
    }
}

struct OrderLiveActivityLockScreenView: View {
    let context: ActivityViewContext<OrderLiveActivityAttributes>

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(alignment: .center, spacing: 8) {
                Image(systemName: orderIcon(for: context.state))
                    .font(.title3)
                    .foregroundStyle(orderTint(for: context.state))

                VStack(alignment: .leading, spacing: 1) {
                    Text(context.attributes.title)
                        .font(.headline)
                        .lineLimit(1)
                    Text(context.attributes.subtitle)
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                }

                Spacer(minLength: 8)

                CountdownView(state: context.state, compact: false)
            }

            Text(context.state.statusLabel)
                .font(.subheadline)
                .fontWeight(.semibold)
                .foregroundStyle(orderTint(for: context.state))
                .lineLimit(1)

            OrderProgressView(state: context.state)
        }
        .padding(14)
        .widgetURL(URL(string: context.attributes.deepLink))
    }
}

struct OrderProgressView: View {
    let state: OrderLiveActivityAttributes.ContentState

    var body: some View {
        if state.stageCount > 0 {
            VStack(alignment: .leading, spacing: 4) {
                ProgressView(value: min(max(state.progress, 0), 1))
                    .progressViewStyle(.linear)
                    .tint(orderTint(for: state))
                if state.stageIndex > 0 {
                    Text("Step \(state.stageIndex) of \(state.stageCount)")
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                }
            }
        }
    }
}

struct CountdownView: View {
    let state: OrderLiveActivityAttributes.ContentState
    let compact: Bool

    private var deadline: Date? {
        guard let countdownAt = state.countdownAt else { return nil }
        return Date(timeIntervalSince1970: countdownAt / 1000)
    }

    var body: some View {
        if let deadline = deadline, !state.isTerminal, deadline > Date() {
            VStack(alignment: .trailing, spacing: 0) {
                if !compact && !state.countdownLabel.isEmpty {
                    Text(state.countdownLabel)
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                }
                Text(timerInterval: Date()...deadline, countsDown: true)
                    .font(compact ? .caption2 : .caption)
                    .fontWeight(.semibold)
                    .monospacedDigit()
            }
        } else {
            Image(systemName: orderIcon(for: state))
                .foregroundStyle(orderTint(for: state))
        }
    }
}

private func orderIcon(for state: OrderLiveActivityAttributes.ContentState) -> String {
    switch state.terminalType {
    case "success": return "checkmark.circle.fill"
    case "failed": return "exclamationmark.triangle.fill"
    case "cancelled": return "xmark.circle.fill"
    default: return "clock.fill"
    }
}

private func orderTint(for state: OrderLiveActivityAttributes.ContentState) -> Color {
    switch state.terminalType {
    case "success": return .green
    case "failed": return .red
    case "cancelled": return .gray
    default: return brandBlue
    }
}
