import Foundation
import Capacitor

@objc(TransparentWebViewPlugin)
public class TransparentWebViewPlugin: CAPPlugin {
    
    override public func load() {
        // Make WebView transparent when plugin loads
        DispatchQueue.main.async {
            if let webView = self.bridge?.webView {
                webView.isOpaque = false
                webView.backgroundColor = UIColor.clear
                webView.scrollView.backgroundColor = UIColor.clear
                
                // Also make the parent view controller's view transparent
                if let viewController = self.bridge?.viewController {
                    viewController.view.backgroundColor = UIColor.clear
                }
            }
        }
    }
    
    @objc func makeTransparent(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            if let webView = self.bridge?.webView {
                webView.isOpaque = false
                webView.backgroundColor = UIColor.clear
                webView.scrollView.backgroundColor = UIColor.clear
                
                if let viewController = self.bridge?.viewController {
                    viewController.view.backgroundColor = UIColor.clear
                }
                
                call.resolve(["success": true])
            } else {
                call.reject("WebView not found")
            }
        }
    }
    
    @objc func makeOpaque(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            if let webView = self.bridge?.webView {
                webView.isOpaque = true
                webView.backgroundColor = UIColor.white
                webView.scrollView.backgroundColor = UIColor.white
                
                if let viewController = self.bridge?.viewController {
                    viewController.view.backgroundColor = UIColor.white
                }
                
                call.resolve(["success": true])
            } else {
                call.reject("WebView not found")
            }
        }
    }
}
