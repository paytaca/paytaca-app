import ActivityKit
import SwiftUI
import WidgetKit

private enum Brand {
    static let blue = Color(red: 41 / 255, green: 121 / 255, blue: 255 / 255)
    static let red = Color(red: 255 / 255, green: 82 / 255, blue: 82 / 255)
    static let surface = Color(red: 0.055, green: 0.063, blue: 0.09)
    static let chip = Color(red: 0.10, green: 0.11, blue: 0.16)

    static var gradient: LinearGradient {
        LinearGradient(
            colors: [blue, blue.opacity(0.55), red],
            startPoint: .leading,
            endPoint: .trailing
        )
    }
}

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
                .activityBackgroundTint(Brand.surface)
                .activitySystemActionForegroundColor(.white)
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    PaytacaMark(size: 22)
                        .padding(.leading, 4)
                }
                DynamicIslandExpandedRegion(.trailing) {
                    CountdownView(state: context.state, compact: false)
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
                    VStack(alignment: .leading, spacing: 7) {
                        StatusChip(state: context.state)
                        OrderProgressView(state: context.state)
                    }
                    .padding(.horizontal, 4)
                }
            } compactLeading: {
                PaytacaMark(size: 15)
            } compactTrailing: {
                CountdownView(state: context.state, compact: true)
            } minimal: {
                // At this size an outcome icon is more useful than the logo,
                // and the logo already carries the branding in the other
                // presentations.
                if context.state.isTerminal {
                    Image(systemName: orderIcon(for: context.state))
                        .foregroundStyle(orderTint(for: context.state))
                } else {
                    PaytacaMark(size: 14)
                }
            }
            .widgetURL(URL(string: context.attributes.deepLink))
            .keylineTint(orderTint(for: context.state))
        }
    }
}

struct OrderLiveActivityLockScreenView: View {
    let context: ActivityViewContext<OrderLiveActivityAttributes>

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack(alignment: .center, spacing: 9) {
                PaytacaMark(size: 24)
                    .shadow(color: Brand.blue.opacity(0.45), radius: 6, y: 1)

                Text("PAYTACA")
                    .font(.system(size: 10, weight: .heavy, design: .rounded))
                    .tracking(1.6)
                    .foregroundStyle(Brand.gradient)
                    .lineLimit(1)

                CountdownView(state: context.state, compact: false, showsIdleIcon: false)
                    .frame(maxWidth: .infinity, alignment: .trailing)
            }

            BrandRule()
                .padding(.vertical, 10)

            HStack(alignment: .center, spacing: 10) {
                VStack(alignment: .leading, spacing: 2) {
                    Text(context.attributes.title)
                        .font(.headline)
                        .lineLimit(1)
                    Text(context.attributes.subtitle)
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                }

                Spacer(minLength: 8)

                StatusChip(state: context.state)
            }

            OrderProgressView(state: context.state)
                .padding(.top, 10)
        }
        .padding(.horizontal, 15)
        .padding(.vertical, 14)
        .background {
            BrandGlow(tint: orderTint(for: context.state))
        }
        .widgetURL(URL(string: context.attributes.deepLink))
    }
}

struct PaytacaMark: View {
    let size: CGFloat

    var body: some View {
        Image("PaytacaMark")
            .resizable()
            .interpolation(.high)
            .scaledToFit()
            .frame(width: size, height: size)
            .accessibilityHidden(true)
    }
}

/// Thin blue-to-red rule that carries the brand gradient through the card.
struct BrandRule: View {
    var body: some View {
        Capsule()
            .fill(Brand.gradient)
            .frame(height: 2)
            .opacity(0.85)
            .accessibilityHidden(true)
    }
}

/// Soft brand wash behind the content so the card reads as Paytaca without
/// competing with the text.
struct BrandGlow: View {
    let tint: Color

    var body: some View {
        ZStack {
            Brand.surface
            RadialGradient(
                colors: [tint.opacity(0.30), tint.opacity(0.02)],
                center: .topTrailing,
                startRadius: 2,
                endRadius: 190
            )
            LinearGradient(
                colors: [Brand.blue.opacity(0.14), .clear, Brand.red.opacity(0.08)],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        }
        .accessibilityHidden(true)
    }
}

struct StatusChip: View {
    let state: OrderLiveActivityAttributes.ContentState

    private var tint: Color { orderTint(for: state) }

    var body: some View {
        HStack(spacing: 5) {
            Image(systemName: orderIcon(for: state))
                .font(.system(size: 9, weight: .bold))
            Text(state.statusLabel)
                .font(.caption2)
                .fontWeight(.semibold)
                .lineLimit(1)
                .minimumScaleFactor(0.8)
        }
        .foregroundStyle(tint)
        .padding(.horizontal, 8)
        .padding(.vertical, 4)
        .background(
            Capsule().fill(tint.opacity(0.16))
        )
        .overlay(
            Capsule().stroke(tint.opacity(0.32), lineWidth: 0.5)
        )
        .layoutPriority(1)
        .accessibilityElement(children: .combine)
        .accessibilityLabel("Status: \(state.statusLabel)")
    }
}

struct OrderProgressView: View {
    let state: OrderLiveActivityAttributes.ContentState

    var body: some View {
        if state.stageCount > 0 {
            VStack(alignment: .leading, spacing: 6) {
                StageTrack(state: state)
                if !state.isTerminal {
                    Text(state.stageIndex > 0 ? "Step \(state.stageIndex) of \(state.stageCount)" : "Processing")
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                }
            }
        }
    }
}

/// Segmented step indicator. The completed steps are one continuous brand
/// gradient (blue → red) rather than a gradient restarted per segment, so the
/// track reads as a single sweep. Upcoming steps stay muted.
struct StageTrack: View {
    let state: OrderLiveActivityAttributes.ContentState

    private var stepCount: Int { max(state.stageCount, 1) }
    private var completed: Int { min(max(state.stageIndex, 0), stepCount) }

    private var accent: LinearGradient {
        switch state.terminalType {
        case "success":
            return LinearGradient(colors: [.green, .green], startPoint: .leading, endPoint: .trailing)
        case "failed":
            return LinearGradient(colors: [Brand.red, Brand.red], startPoint: .leading, endPoint: .trailing)
        case "cancelled":
            return LinearGradient(colors: [.gray, .gray], startPoint: .leading, endPoint: .trailing)
        default:
            return LinearGradient(
                colors: [Brand.blue, Brand.blue.opacity(0.8), Brand.red],
                startPoint: .leading,
                endPoint: .trailing
            )
        }
    }

    private let spacing: CGFloat = 4

    var body: some View {
        GeometryReader { geometry in
            let total = geometry.size.width
            let segment = max((total - spacing * CGFloat(stepCount - 1)) / CGFloat(stepCount), 1)
            let filledWidth = completed > 0
                ? segment * CGFloat(completed) + spacing * CGFloat(completed - 1)
                : 0

            ZStack(alignment: .leading) {
                SegmentedMask(count: stepCount, upto: stepCount, totalWidth: total, spacing: spacing)
                    .fill(Brand.chip)

                // The gradient is sized to the filled run so the full
                // blue-to-red sweep is visible at every step instead of only
                // at completion.
                accent
                    .frame(width: filledWidth)
                    .mask(
                        SegmentedMask(
                            count: stepCount,
                            upto: completed,
                            totalWidth: total,
                            spacing: spacing
                        )
                    )
            }
        }
        .frame(height: 4)
    }
}

/// Draws `count` evenly spaced capsules laid out across `totalWidth`, filling
/// only the first `upto`. Positions are always computed from `totalWidth` so a
/// clipped (narrower) frame keeps segments aligned with the full track.
private struct SegmentedMask: Shape {
    let count: Int
    let upto: Int
    let totalWidth: CGFloat
    let spacing: CGFloat

    func path(in rect: CGRect) -> Path {
        var path = Path()
        guard count > 0 else { return path }
        let segment = max((totalWidth - spacing * CGFloat(count - 1)) / CGFloat(count), 1)
        for index in 0..<min(upto, count) {
            let origin = rect.minX + CGFloat(index) * (segment + spacing)
            path.addRoundedRect(
                in: CGRect(x: origin, y: rect.minY, width: segment, height: rect.height),
                cornerSize: CGSize(width: rect.height / 2, height: rect.height / 2)
            )
        }
        return path
    }
}

struct CountdownView: View {
    let state: OrderLiveActivityAttributes.ContentState
    let compact: Bool
    /// The lock screen already shows the outcome in `StatusChip`, so it opts
    /// out of the idle icon to avoid saying the same thing twice.
    var showsIdleIcon: Bool = true

    private var deadline: Date? {
        guard let countdownAt = state.countdownAt else { return nil }
        return Date(timeIntervalSince1970: countdownAt / 1000)
    }

    var body: some View {
        if let deadline = deadline, !state.isTerminal, deadline > Date() {
            VStack(alignment: .trailing, spacing: 1) {
                if !compact && !state.countdownLabel.isEmpty {
                    Text(state.countdownLabel.uppercased())
                        .font(.system(size: 8, weight: .bold, design: .rounded))
                        .tracking(0.8)
                        // `.tracking` appends space after the final glyph,
                        // which would leave the label's optical right edge
                        // inset from the timer's. Pull it back so both align
                        // flush with the trailing edge.
                        .padding(.trailing, -0.8)
                        .foregroundStyle(.secondary)
                }
                Text(timerInterval: Date()...deadline, countsDown: true)
                    .font(compact ? .caption2 : .caption)
                    .fontWeight(.semibold)
                    .monospacedDigit()
                    .foregroundStyle(.primary)
            }
        } else if showsIdleIcon {
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
    case "failed": return Brand.red
    case "cancelled": return .gray
    default: return Brand.blue
    }
}
