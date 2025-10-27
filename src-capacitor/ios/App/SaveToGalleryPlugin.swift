import Foundation
import Capacitor
import Photos
import UIKit

@objc(SaveToGalleryPlugin)
public class SaveToGalleryPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "SaveToGalleryPlugin"
    public let jsName = "SaveToGallery"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "saveImage", returnType: CAPPluginReturnPromise)
    ]
    
    @objc func saveImage(_ call: CAPPluginCall) {
        NSLog("SaveToGalleryPlugin: saveImage called")
        
        guard let base64Data = call.getString("base64Data") else {
            NSLog("SaveToGalleryPlugin: No base64Data provided")
            call.reject("Must provide base64Data")
            return
        }
        
        NSLog("SaveToGalleryPlugin: base64Data received, length: \(base64Data.count)")
        let filename = call.getString("filename") ?? "IMG_\(Date().timeIntervalSince1970).png"
        
        // Decode base64 to image
        guard let imageData = Data(base64Encoded: base64Data),
              let image = UIImage(data: imageData) else {
            NSLog("SaveToGalleryPlugin: Failed to decode image from base64")
            call.reject("Failed to decode image")
            return
        }
        
        NSLog("SaveToGalleryPlugin: Image decoded successfully, size: \(image.size)")
        
        // Check and request photo library permission
        if #available(iOS 14, *) {
            // Check current authorization status first
            let status = PHPhotoLibrary.authorizationStatus(for: .addOnly)
            NSLog("SaveToGalleryPlugin: Current authorization status (iOS 14+): \(status.rawValue)")
            
            switch status {
            case .authorized, .limited:
                // Already authorized, proceed to save
                NSLog("SaveToGalleryPlugin: Already authorized, saving image")
                self.saveImageToPhotoLibrary(image: image, filename: filename, call: call)
            case .notDetermined:
                // Request authorization
                NSLog("SaveToGalleryPlugin: Requesting authorization...")
                PHPhotoLibrary.requestAuthorization(for: .addOnly) { newStatus in
                    NSLog("SaveToGalleryPlugin: Authorization response: \(newStatus.rawValue)")
                    if newStatus == .authorized || newStatus == .limited {
                        self.saveImageToPhotoLibrary(image: image, filename: filename, call: call)
                    } else {
                        call.reject("Photo library permission denied. Please go to Settings > Paytaca > Photos and enable access.")
                    }
                }
            default:
                // Denied or restricted
                NSLog("SaveToGalleryPlugin: Permission denied or restricted (iOS 14+)")
                call.reject("Photo library permission denied. Please go to Settings > Paytaca > Photos and enable access.")
            }
        } else {
            // iOS 13 and below
            let status = PHPhotoLibrary.authorizationStatus()
            NSLog("SaveToGalleryPlugin: Current authorization status (iOS 13): \(status.rawValue)")
            
            switch status {
            case .authorized:
                // Already authorized, proceed to save
                self.saveImageToPhotoLibrary(image: image, filename: filename, call: call)
            case .notDetermined:
                // Request authorization
                PHPhotoLibrary.requestAuthorization { newStatus in
                    if newStatus == .authorized {
                        self.saveImageToPhotoLibrary(image: image, filename: filename, call: call)
                    } else {
                        call.reject("Photo library permission denied. Please go to Settings > Paytaca > Photos and enable access.")
                    }
                }
            default:
                // Denied or restricted
                NSLog("SaveToGalleryPlugin: Permission denied or restricted (iOS 13)")
                call.reject("Photo library permission denied. Please go to Settings > Paytaca > Photos and enable access.")
            }
        }
    }
    
    private func saveImageToPhotoLibrary(image: UIImage, filename: String, call: CAPPluginCall) {
        NSLog("SaveToGalleryPlugin: Attempting to save image to photo library")
        var localIdentifier: String?
        
        PHPhotoLibrary.shared().performChanges({
            NSLog("SaveToGalleryPlugin: Inside performChanges block")
            let creationRequest = PHAssetCreationRequest.forAsset()
            creationRequest.addResource(with: .photo, data: image.pngData()!, options: nil)
            localIdentifier = creationRequest.placeholderForCreatedAsset?.localIdentifier
        }) { success, error in
            DispatchQueue.main.async {
                if success, let identifier = localIdentifier {
                    NSLog("SaveToGalleryPlugin: Successfully saved image with identifier: \(identifier)")
                    call.resolve([
                        "filePath": identifier
                    ])
                } else {
                    let errorMessage = error?.localizedDescription ?? "Unknown error"
                    NSLog("SaveToGalleryPlugin: Failed to save image: \(errorMessage)")
                    call.reject("Failed to save image to photo library: \(errorMessage)")
                }
            }
        }
    }
}


