import Foundation
import Capacitor
import AVFoundation

@objc(AudioModePlugin)
public class AudioModePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "AudioModePlugin"
    public let jsName = "AudioMode"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "isSilentOrDnd", returnType: CAPPluginReturnPromise)
    ]

    @objc func isSilentOrDnd(_ call: CAPPluginCall) {
        let session = AVAudioSession.sharedInstance()

        var isSilentOrDnd = false

        if session.outputVolume == 0 {
            isSilentOrDnd = true
        }

        call.resolve([
            "isSilentOrDnd": isSilentOrDnd
        ])
    }
}