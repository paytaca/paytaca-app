import UIKit
import Capacitor

/// Custom view controller for privacy overlay that properly handles gradient layer frame updates
class PrivacyOverlayViewController: UIViewController {
    private var gradientLayer: CAGradientLayer?
    
    override func viewDidLoad() {
        super.viewDidLoad()
        
        // Create darker background gradient for privacy overlay
        // Using darker colors to reduce brightness in app switcher preview
        let gradientLayer = CAGradientLayer()
        gradientLayer.colors = [
            UIColor(red: 0.20, green: 0.22, blue: 0.25, alpha: 1.0).cgColor,  // Dark grey
            UIColor(red: 0.15, green: 0.17, blue: 0.20, alpha: 1.0).cgColor,  // Darker grey
            UIColor(red: 0.18, green: 0.20, blue: 0.23, alpha: 1.0).cgColor,  // Medium dark grey
            UIColor(red: 0.12, green: 0.14, blue: 0.17, alpha: 1.0).cgColor   // Darkest grey
        ]
        gradientLayer.locations = [0.0, 0.33, 0.66, 1.0]
        gradientLayer.startPoint = CGPoint(x: 0.0, y: 0.0)
        gradientLayer.endPoint = CGPoint(x: 1.0, y: 1.0)
        view.layer.insertSublayer(gradientLayer, at: 0)
        self.gradientLayer = gradientLayer
    }
    
    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        // Update gradient layer frame when view bounds change
        // This is called after the view has been laid out, so view.bounds is now correct
        gradientLayer?.frame = view.bounds
    }
}

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?
    // Privacy overlay to hide sensitive content in app switcher
    private var privacyOverlayWindow: UIWindow?
    // Track whether screenshot security is enabled
    private var isSecurityEnabled: Bool = false

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Override point for customization after application launch.
        
        // Listen for screenshot security changes from the plugin
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(securitySettingChanged(_:)),
            name: NSNotification.Name("ScreenshotSecurityChanged"),
            object: nil
        )
        
        return true
    }
    
    @objc private func securitySettingChanged(_ notification: Notification) {
        if let userInfo = notification.userInfo,
           let enabled = userInfo["enabled"] as? Bool {
            NSLog("AppDelegate: Security setting changed to \(enabled)")
            isSecurityEnabled = enabled
            
            // If security is disabled and we're in background, hide the overlay
            // If security is enabled and we're in background, show the overlay
            if !enabled {
                DispatchQueue.main.async {
                    self.hidePrivacyOverlay()
                }
            }
        }
    }

    func applicationWillResignActive(_ application: UIApplication) {
        // SECURITY: Show privacy overlay immediately when app goes to background
        // This prevents sensitive content from appearing in the app switcher
        // Only show if security is enabled (controlled by ScreenshotSecurityPlugin)
        if isSecurityEnabled {
            showPrivacyOverlay()
        }
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        // Use this method to release shared resources, save user data, invalidate timers, and store enough application state information to restore your application to its current state in case it is terminated later.
        // If your application supports background execution, this method is called instead of applicationWillTerminate: when the user quits.
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
        // Called as part of the transition from the background to the active state; here you can undo many of the changes made on entering the background.
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        // Hide privacy overlay when app becomes active
        hidePrivacyOverlay()
    }
    
    // MARK: - Privacy Overlay Methods
    
    private func showPrivacyOverlay() {
        guard privacyOverlayWindow == nil else { return }
        
        // Create a new window for the privacy overlay
        if let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene {
            let overlayWindow = UIWindow(windowScene: windowScene)
            overlayWindow.rootViewController = createPrivacyViewController()
            overlayWindow.windowLevel = .alert + 1
            overlayWindow.makeKeyAndVisible()
            self.privacyOverlayWindow = overlayWindow
        }
    }
    
    private func hidePrivacyOverlay() {
        privacyOverlayWindow?.isHidden = true
        privacyOverlayWindow = nil
    }
    
    private func createPrivacyViewController() -> UIViewController {
        let viewController = PrivacyOverlayViewController()
        let view = viewController.view!
        
        // Create glassmorphic logo container similar to WalletSwitchLoading
        let logoContainer = UIView()
        logoContainer.translatesAutoresizingMaskIntoConstraints = false
        
        // Glassmorphic styling - dark theme (matching darker gradient background)
        logoContainer.backgroundColor = UIColor(white: 1.0, alpha: 0.05)
        logoContainer.layer.cornerRadius = 55
        logoContainer.layer.borderWidth = 2.0
        logoContainer.layer.borderColor = UIColor(white: 1.0, alpha: 0.15).cgColor
        
        // Add shadow for depth (matching WalletSwitchLoading dark theme)
        logoContainer.layer.shadowColor = UIColor.black.cgColor
        logoContainer.layer.shadowOffset = CGSize(width: 0, height: 6)
        logoContainer.layer.shadowRadius = 20
        logoContainer.layer.shadowOpacity = 0.3
        
        // Add blue glow effect (theme-glassmorphic-blue style)
        // Create a circular glow view behind the logo container
        let glowView = UIView()
        glowView.translatesAutoresizingMaskIntoConstraints = false
        glowView.backgroundColor = UIColor(red: 66/255, green: 165/255, blue: 245/255, alpha: 0.2)
        glowView.layer.cornerRadius = 65
        glowView.alpha = 0.3
        
        // Add both views to hierarchy first
        view.addSubview(glowView)
        view.addSubview(logoContainer)
        
        // Constrain both views relative to parent view (not relative to each other)
        // This prevents constraint conflicts
        NSLayoutConstraint.activate([
            // Logo container constraints
            logoContainer.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            logoContainer.centerYAnchor.constraint(equalTo: view.centerYAnchor),
            logoContainer.widthAnchor.constraint(equalToConstant: 110),
            logoContainer.heightAnchor.constraint(equalToConstant: 110),
            
            // Glow view constraints (centered same as logo container)
            glowView.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            glowView.centerYAnchor.constraint(equalTo: view.centerYAnchor),
            glowView.widthAnchor.constraint(equalToConstant: 130),
            glowView.heightAnchor.constraint(equalToConstant: 130)
        ])
        
        // Ensure glow view is behind logo container
        view.sendSubviewToBack(glowView)
        
        // Try to load logo image from multiple possible locations
        var logoImage: UIImage?
        
        // Method 1: Try loading from www/assets folder (Capacitor bundle)
        // In Capacitor, assets from src/assets get copied to www/assets during build
        // Try multiple possible paths for the www folder
        let possiblePaths = [
            Bundle.main.resourcePath,
            Bundle.main.bundlePath,
            Bundle.main.path(forResource: "www", ofType: nil)
        ].compactMap { $0 }
        
        for basePath in possiblePaths {
            let logoPath = "\(basePath)/www/assets/paytaca_logo.png"
            if FileManager.default.fileExists(atPath: logoPath) {
                logoImage = UIImage(contentsOfFile: logoPath)
                if logoImage != nil { break }
            }
            // Also try without www prefix (in case www is already in the path)
            let altPath = "\(basePath)/assets/paytaca_logo.png"
            if FileManager.default.fileExists(atPath: altPath) {
                logoImage = UIImage(contentsOfFile: altPath)
                if logoImage != nil { break }
            }
        }
        
        // Method 2: Try using Bundle pathForResource (alternative method)
        if logoImage == nil {
            if let logoPath = Bundle.main.path(forResource: "paytaca_logo", ofType: "png", inDirectory: "www/assets") {
                logoImage = UIImage(contentsOfFile: logoPath)
            }
        }
        if logoImage == nil {
            if let logoPath = Bundle.main.path(forResource: "paytaca_logo", ofType: "png", inDirectory: "assets") {
                logoImage = UIImage(contentsOfFile: logoPath)
            }
        }
        
        // Method 3: Try loading from asset catalog (if manually added to Xcode)
        if logoImage == nil {
            logoImage = UIImage(named: "paytaca_logo")
        }
        if logoImage == nil {
            logoImage = UIImage(named: "paytaca_logo.png")
        }
        
        // Method 4: Try AppIcon as fallback (app icon)
        if logoImage == nil {
            logoImage = UIImage(named: "AppIcon")
        }
        
        // Create image view for logo
        let imageView = UIImageView()
        if let logo = logoImage {
            imageView.image = logo
        } else {
            // Fallback: create a simple "P" placeholder if logo not found
            let placeholderSize = CGSize(width: 50, height: 50)
            UIGraphicsBeginImageContextWithOptions(placeholderSize, false, 0)
            let context = UIGraphicsGetCurrentContext()!
            
            // Draw a simple "P" shape
            context.setFillColor(UIColor.white.cgColor)
            context.setStrokeColor(UIColor.white.cgColor)
            context.setLineWidth(4)
            
            // Draw P shape
            context.move(to: CGPoint(x: 10, y: 10))
            context.addLine(to: CGPoint(x: 10, y: 40))
            context.move(to: CGPoint(x: 10, y: 10))
            context.addLine(to: CGPoint(x: 30, y: 10))
            context.addLine(to: CGPoint(x: 35, y: 15))
            context.addLine(to: CGPoint(x: 35, y: 22))
            context.addLine(to: CGPoint(x: 30, y: 25))
            context.addLine(to: CGPoint(x: 10, y: 25))
            context.strokePath()
            
            imageView.image = UIGraphicsGetImageFromCurrentImageContext()
            UIGraphicsEndImageContext()
        }
        
        imageView.contentMode = .scaleAspectFit
        imageView.translatesAutoresizingMaskIntoConstraints = false
        logoContainer.addSubview(imageView)
        
        // Add drop shadow to logo image
        imageView.layer.shadowColor = UIColor.black.cgColor
        imageView.layer.shadowOffset = CGSize(width: 0, height: 2)
        imageView.layer.shadowRadius = 6
        imageView.layer.shadowOpacity = 0.15
        
        NSLayoutConstraint.activate([
            imageView.centerXAnchor.constraint(equalTo: logoContainer.centerXAnchor),
            imageView.centerYAnchor.constraint(equalTo: logoContainer.centerYAnchor),
            imageView.widthAnchor.constraint(equalToConstant: 50),
            imageView.heightAnchor.constraint(equalToConstant: 50)
        ])
        
        // Add pulse animation similar to WalletSwitchLoading
        let pulseAnimation = CABasicAnimation(keyPath: "transform.scale")
        pulseAnimation.fromValue = 1.0
        pulseAnimation.toValue = 1.1
        pulseAnimation.duration = 1.5
        pulseAnimation.autoreverses = true
        pulseAnimation.repeatCount = .infinity
        pulseAnimation.timingFunction = CAMediaTimingFunction(name: .easeInEaseOut)
        logoContainer.layer.add(pulseAnimation, forKey: "pulse")
        
        return viewController
    }

    func applicationWillTerminate(_ application: UIApplication) {
        // Called when the application is about to terminate. Save data if appropriate. See also applicationDidEnterBackground:.
    }

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        // Called when the app was launched with a url. Feel free to add additional processing here,
        // but if you want the App API to support tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ app: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([Any]?) -> Void) -> Bool {
        if userActivity.activityType == NSUserActivityTypeBrowsingWeb {
            let url = userActivity.webpageURL!

            return ApplicationDelegateProxy.shared.application(app, open: url)
        }
        return true
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        // Called when the app was launched with an activity, including Universal Links.
        // Feel free to add additional processing here, but if you want the App API to support
        // tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }

    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
      NotificationCenter.default.post(name: .capacitorDidRegisterForRemoteNotifications, object: deviceToken)
    }

    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
      NotificationCenter.default.post(name: .capacitorDidFailToRegisterForRemoteNotifications, object: error)
    }


}

