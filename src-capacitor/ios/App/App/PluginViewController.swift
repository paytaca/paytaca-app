import UIKit
import Capacitor

// Registers custom native plugins for Capacitor v6+.
// Main.storyboard should use this class instead of CAPBridgeViewController.
@objc(PluginViewController)
class PluginViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        super.capacitorDidLoad()
        // Custom plugins (local Swift files)
        bridge?.registerPluginInstance(SaveToGalleryPlugin())
        bridge?.registerPluginInstance(ScreenshotSecurityPlugin())
        bridge?.registerPluginInstance(AudioModePlugin())
    }
}

