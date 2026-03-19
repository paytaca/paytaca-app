import Foundation
import Capacitor
import UIKit

@objc(ScreenshotSecurityPlugin)
public class ScreenshotSecurityPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "ScreenshotSecurityPlugin"
    public let jsName = "ScreenshotSecurity"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "setSecureFlag", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "isSecureFlagEnabled", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "disablePrivacyOverlay", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "enablePrivacyOverlay", returnType: CAPPluginReturnPromise)
    ]
    
    // Store the secure flag state
    private var isSecureEnabled: Bool = false
    
    @objc func setSecureFlag(_ call: CAPPluginCall) {
        guard let enabled = call.getBool("enabled") else {
            call.reject("Must provide 'enabled' boolean parameter")
            return
        }
        
        isSecureEnabled = enabled
        NSLog("ScreenshotSecurityPlugin: Security flag set to \(enabled)")
        
        // Notify AppDelegate about the change
        NotificationCenter.default.post(
            name: NSNotification.Name("ScreenshotSecurityChanged"),
            object: nil,
            userInfo: ["enabled": enabled]
        )
        
        call.resolve([
            "success": true,
            "enabled": enabled
        ])
    }
    
    @objc func isSecureFlagEnabled(_ call: CAPPluginCall) {
        call.resolve([
            "enabled": isSecureEnabled
        ])
    }
    
    @objc func disablePrivacyOverlay(_ call: CAPPluginCall) {
        NSLog("ScreenshotSecurityPlugin: Disabling privacy overlay (e.g., for QR scanner)")
        // Notify AppDelegate to disable privacy overlay
        NotificationCenter.default.post(
            name: NSNotification.Name("PrivacyOverlayDisabled"),
            object: nil
        )
        call.resolve(["success": true])
    }
    
    @objc func enablePrivacyOverlay(_ call: CAPPluginCall) {
        NSLog("ScreenshotSecurityPlugin: Enabling privacy overlay")
        // Notify AppDelegate to enable privacy overlay
        NotificationCenter.default.post(
            name: NSNotification.Name("PrivacyOverlayEnabled"),
            object: nil
        )
        call.resolve(["success": true])
    }
}

