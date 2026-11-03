import Foundation
import Capacitor
import UIKit

@objc(DeferredReferralPlugin)
public class DeferredReferralPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "DeferredReferralPlugin"
    public let jsName = "DeferredReferral"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "getPasteboardReferral", returnType: CAPPluginReturnPromise)
    ]

    @objc func getPasteboardReferral(_ call: CAPPluginCall) {
        if #available(iOS 16.0, *) {
            let patterns: Set<UIPasteboard.DetectionPattern> = [.probableWebURL]
            UIPasteboard.general.detectValues(for: patterns) { result in
                var referrer = ""
                let pattern = UIPasteboard.DetectionPattern.probableWebURL
                if let detected = try? result.get() {
                    if let url = detected[pattern] as? URL {
                        referrer = url.absoluteString
                    } else if let urlString = detected[pattern] as? String {
                        referrer = urlString
                    }
                }
                DispatchQueue.main.async {
                    call.resolve([
                        "referrer": referrer,
                        "supported": true
                    ])
                }
            }
        } else {
            call.resolve([
                "referrer": "",
                "supported": false
            ])
        }
    }
}
