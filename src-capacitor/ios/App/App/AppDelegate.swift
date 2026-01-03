import UIKit
import Capacitor

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
        let viewController = UIViewController()
        let view = viewController.view!
        
        // Create glassmorphic blue background gradient
        let gradientLayer = CAGradientLayer()
        gradientLayer.frame = view.bounds
        gradientLayer.colors = [
            UIColor(red: 0.96, green: 0.97, blue: 0.98, alpha: 1.0).cgColor,
            UIColor(red: 0.91, green: 0.93, blue: 0.96, alpha: 1.0).cgColor,
            UIColor(red: 0.94, green: 0.96, blue: 0.97, alpha: 1.0).cgColor,
            UIColor(red: 0.89, green: 0.91, blue: 0.94, alpha: 1.0).cgColor
        ]
        gradientLayer.locations = [0.0, 0.33, 0.66, 1.0]
        gradientLayer.startPoint = CGPoint(x: 0.0, y: 0.0)
        gradientLayer.endPoint = CGPoint(x: 1.0, y: 1.0)
        view.layer.insertSublayer(gradientLayer, at: 0)
        
        // Add logo (if you have one in assets, otherwise use a colored circle)
        let logoContainer = UIView()
        logoContainer.backgroundColor = UIColor(white: 1.0, alpha: 0.5)
        logoContainer.layer.cornerRadius = 55
        logoContainer.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(logoContainer)
        
        // Center logo container
        NSLayoutConstraint.activate([
            logoContainer.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            logoContainer.centerYAnchor.constraint(equalTo: view.centerYAnchor),
            logoContainer.widthAnchor.constraint(equalToConstant: 110),
            logoContainer.heightAnchor.constraint(equalToConstant: 110)
        ])
        
        // Try to load logo image from assets
        if let logoImage = UIImage(named: "AppIcon") {
            let imageView = UIImageView(image: logoImage)
            imageView.contentMode = .scaleAspectFit
            imageView.translatesAutoresizingMaskIntoConstraints = false
            logoContainer.addSubview(imageView)
            
            NSLayoutConstraint.activate([
                imageView.centerXAnchor.constraint(equalTo: logoContainer.centerXAnchor),
                imageView.centerYAnchor.constraint(equalTo: logoContainer.centerYAnchor),
                imageView.widthAnchor.constraint(equalToConstant: 60),
                imageView.heightAnchor.constraint(equalToConstant: 60)
            ])
        }
        
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

