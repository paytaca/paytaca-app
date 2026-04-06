import Foundation
import Capacitor
import AVFoundation
import UIKit
import CoreMedia

@objc(QrNativeScannerPlugin)
public class QrNativeScannerPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "QrNativeScannerPlugin"
    public let jsName = "QrNativeScanner"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "checkPermissions", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "requestPermissions", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "scan", returnType: CAPPluginReturnPromise),
    ]

    private var activeController: QrNativeScannerViewController?
    private var activeCall: CAPPluginCall?

    @objc public override func checkPermissions(_ call: CAPPluginCall) {
        let status = AVCaptureDevice.authorizationStatus(for: .video)
        call.resolve([
            "camera": mapPermission(status)
        ])
    }

    @objc public override func requestPermissions(_ call: CAPPluginCall) {
        AVCaptureDevice.requestAccess(for: .video) { _granted in
            DispatchQueue.main.async {
                let status = AVCaptureDevice.authorizationStatus(for: .video)
                call.resolve([
                    "camera": self.mapPermission(status)
                ])
            }
        }
    }

    @objc func scan(_ call: CAPPluginCall) {
        // Only allow one active scan at a time.
        if activeCall != nil {
            call.reject("Scan already in progress", "SCAN_IN_PROGRESS")
            return
        }

        let status = AVCaptureDevice.authorizationStatus(for: .video)
        if status != .authorized {
            // Best effort request if not authorized yet.
            if status == .notDetermined {
                AVCaptureDevice.requestAccess(for: .video) { granted in
                    DispatchQueue.main.async {
                        if granted {
                            self.presentScanner(call: call)
                        } else {
                            call.reject("Camera permission denied", "PERMISSION_DENIED")
                        }
                    }
                }
                return
            }

            call.reject("Camera permission not granted", "PERMISSION_DENIED")
            return
        }

        presentScanner(call: call)
    }

    private func presentScanner(call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard let vc = self.bridge?.viewController else {
                call.reject("No view controller", "NO_VIEW_CONTROLLER")
                return
            }

            self.activeCall = call

            let scanner = QrNativeScannerViewController()
            scanner.onResult = { result in
                self.cleanupScanner(dismissFrom: scanner) {
                    call.resolve(["rawValue": result])
                }
            }
            scanner.onCancel = {
                self.cleanupScanner(dismissFrom: scanner) {
                    call.reject("Cancelled", "CANCELLED")
                }
            }
            scanner.onError = { err in
                self.cleanupScanner(dismissFrom: scanner) {
                    call.reject(err.localizedDescription, "SCAN_FAILED")
                }
            }

            self.activeController = scanner
            scanner.modalPresentationStyle = .fullScreen
            vc.present(scanner, animated: true)
        }
    }

    private func cleanupScanner(dismissFrom scanner: UIViewController, completion: @escaping () -> Void) {
        DispatchQueue.main.async {
            self.activeController = nil
            self.activeCall = nil
            scanner.dismiss(animated: true, completion: completion)
        }
    }

    private func mapPermission(_ status: AVAuthorizationStatus) -> String {
        switch status {
        case .authorized: return "granted"
        case .denied, .restricted: return "denied"
        case .notDetermined: return "prompt"
        @unknown default: return "prompt"
        }
    }
}

final class QrNativeScannerViewController: UIViewController, AVCaptureMetadataOutputObjectsDelegate {
    var onResult: ((String) -> Void)?
    var onCancel: (() -> Void)?
    var onError: ((Error) -> Void)?

    private let session = AVCaptureSession()
    private var previewLayer: AVCaptureVideoPreviewLayer?
    private var didFinish = false
    private var metadataOutput: AVCaptureMetadataOutput?
    private let statusLabel = UILabel()
    private var lastInterruptionReasonRaw: Int?
    private var didApplyLowPowerFallback = false
    private var captureDevice: AVCaptureDevice?

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .black

        setupCapture()
        setupOverlay()
        setupStatusLabel()
        setupSessionObservers()
    }

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        previewLayer?.frame = view.bounds
        if let connection = previewLayer?.connection, connection.isVideoOrientationSupported {
            connection.videoOrientation = .portrait
        }
    }

    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        startSession()
    }

    override func viewWillDisappear(_ animated: Bool) {
        super.viewWillDisappear(animated)
        stopSession()
    }

    deinit {
        NotificationCenter.default.removeObserver(self)
    }

    private func setupCapture() {
        do {
            // Prefer the back wide angle camera explicitly.
            guard let device = AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: .back)
                    ?? AVCaptureDevice.default(for: .video) else {
                throw NSError(domain: "QrNativeScanner", code: 1, userInfo: [NSLocalizedDescriptionKey: "No camera device"])
            }
            captureDevice = device

            session.beginConfiguration()
            // QR scanning does not need high resolution; use a low-cost preset to avoid iOS system pressure interruptions.
            if session.canSetSessionPreset(.cif352x288) {
                session.sessionPreset = .cif352x288
            } else if session.canSetSessionPreset(.vga640x480) {
                session.sessionPreset = .vga640x480
            } else if session.canSetSessionPreset(.medium) {
                session.sessionPreset = .medium
            } else if session.canSetSessionPreset(.low) {
                session.sessionPreset = .low
            }

            // Reduce frame rate to lessen system pressure.
            do {
                try device.lockForConfiguration()
                // Aim for ~10fps if supported.
                let tenFps = CMTime(value: 1, timescale: 10)
                if device.activeFormat.videoSupportedFrameRateRanges.contains(where: { $0.minFrameDuration <= tenFps && tenFps <= $0.maxFrameDuration }) {
                    device.activeVideoMinFrameDuration = tenFps
                    device.activeVideoMaxFrameDuration = tenFps
                }
                device.unlockForConfiguration()
            } catch {
                // Not fatal; continue.
                updateStatus("Warn: cannot set FPS (\(error.localizedDescription))")
            }

            let input = try AVCaptureDeviceInput(device: device)
            if session.canAddInput(input) {
                session.addInput(input)
            } else {
                throw NSError(domain: "QrNativeScanner", code: 2, userInfo: [NSLocalizedDescriptionKey: "Cannot add camera input"])
            }

            let output = AVCaptureMetadataOutput()
            if session.canAddOutput(output) {
                session.addOutput(output)
            } else {
                throw NSError(domain: "QrNativeScanner", code: 3, userInfo: [NSLocalizedDescriptionKey: "Cannot add metadata output"])
            }
            output.setMetadataObjectsDelegate(self, queue: DispatchQueue.main)
            // Only set types supported on this device/output
            let desired: [AVMetadataObject.ObjectType] = [.qr]
            let available = output.availableMetadataObjectTypes
            output.metadataObjectTypes = desired.filter { available.contains($0) }
            metadataOutput = output

            session.commitConfiguration()

            let preview = AVCaptureVideoPreviewLayer(session: session)
            preview.videoGravity = .resizeAspectFill
            preview.frame = view.bounds
            view.layer.insertSublayer(preview, at: 0)
            previewLayer = preview
        } catch {
            session.commitConfiguration()
            updateStatus("Setup error: \(error.localizedDescription)")
            onError?(error)
        }
    }

    private func applyLowPowerFallbackAndRestartIfNeeded() {
        guard !didApplyLowPowerFallback else { return }
        didApplyLowPowerFallback = true

        updateStatus("Applying low-power camera settings…")
        session.beginConfiguration()
        if session.canSetSessionPreset(.low) {
            session.sessionPreset = .low
        }
        session.commitConfiguration()

        if let device = captureDevice {
            do {
                try device.lockForConfiguration()
                let fiveFps = CMTime(value: 1, timescale: 5)
                if device.activeFormat.videoSupportedFrameRateRanges.contains(where: { $0.minFrameDuration <= fiveFps && fiveFps <= $0.maxFrameDuration }) {
                    device.activeVideoMinFrameDuration = fiveFps
                    device.activeVideoMaxFrameDuration = fiveFps
                }
                device.unlockForConfiguration()
            } catch {
                updateStatus("Warn: fallback FPS failed (\(error.localizedDescription))")
            }
        }

        stopSession()
        startSession()
    }

    private func startSession() {
        guard !session.isRunning else { return }
        updateStatus("Starting camera…")
        // Start on next runloop tick to ensure presentation/layout is complete.
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
            DispatchQueue.global(qos: .userInitiated).async {
                self.session.startRunning()
                DispatchQueue.main.async {
                    self.updateStatus(self.session.isRunning ? "Camera running" : "Camera failed to start")
                }
            }
        }
    }

    private func stopSession() {
        guard session.isRunning else { return }
        DispatchQueue.global(qos: .userInitiated).async {
            self.session.stopRunning()
        }
    }

    private func setupStatusLabel() {
        statusLabel.translatesAutoresizingMaskIntoConstraints = false
        statusLabel.textColor = UIColor.white.withAlphaComponent(0.85)
        statusLabel.font = UIFont.systemFont(ofSize: 12, weight: .medium)
        statusLabel.numberOfLines = 0
        statusLabel.textAlignment = .center
        statusLabel.text = "Initializing…"
        view.addSubview(statusLabel)

        NSLayoutConstraint.activate([
            statusLabel.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 16),
            statusLabel.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -16),
            statusLabel.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor, constant: -16),
        ])
    }

    private func updateStatus(_ text: String) {
        DispatchQueue.main.async {
            self.statusLabel.text = text
            NSLog("QrNativeScanner: \(text)")
        }
    }

    private func setupSessionObservers() {
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(sessionRuntimeError(_:)),
            name: .AVCaptureSessionRuntimeError,
            object: session
        )
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(sessionWasInterrupted(_:)),
            name: .AVCaptureSessionWasInterrupted,
            object: session
        )
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(sessionInterruptionEnded(_:)),
            name: .AVCaptureSessionInterruptionEnded,
            object: session
        )
    }

    @objc private func sessionRuntimeError(_ notification: Notification) {
        let err = notification.userInfo?[AVCaptureSessionErrorKey] as? NSError
        updateStatus("Runtime error: \(err?.localizedDescription ?? "Unknown")")
    }

    @objc private func sessionWasInterrupted(_ notification: Notification) {
        let reasonRaw = (notification.userInfo?[AVCaptureSessionInterruptionReasonKey] as? NSNumber)?.intValue
        lastInterruptionReasonRaw = reasonRaw
        let reasonText: String
        switch reasonRaw {
        case 1: reasonText = "audioDeviceInUseByAnotherClient"
        case 2: reasonText = "videoDeviceInUseByAnotherClient"
        case 3: reasonText = "videoDeviceNotAvailableWithMultipleForegroundApps"
        case 4: reasonText = "videoDeviceNotAvailableDueToSystemPressure"
        case 5: reasonText = "videoDeviceNotAvailableInBackground"
        default: reasonText = "unknown"
        }
        updateStatus("Interrupted: \(reasonText) (\(reasonRaw ?? -1))")

        // If iOS reports system pressure immediately, try an even lower preset.
        if reasonRaw == 4 {
            applyLowPowerFallbackAndRestartIfNeeded()
        }
    }

    @objc private func sessionInterruptionEnded(_ notification: Notification) {
        updateStatus("Interruption ended")
    }

    private func setupOverlay() {
        // Close button (top-right)
        let close = UIButton(type: .system)
        close.translatesAutoresizingMaskIntoConstraints = false
        close.setTitle("✕", for: .normal)
        close.titleLabel?.font = UIFont.systemFont(ofSize: 28, weight: .regular)
        close.setTitleColor(.white, for: .normal)
        close.addTarget(self, action: #selector(cancelTapped), for: .touchUpInside)
        view.addSubview(close)

        NSLayoutConstraint.activate([
            close.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor, constant: 12),
            close.trailingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.trailingAnchor, constant: -12),
            close.widthAnchor.constraint(equalToConstant: 44),
            close.heightAnchor.constraint(equalToConstant: 44),
        ])

        // Simple framing guides
        let frameView = UIView()
        frameView.translatesAutoresizingMaskIntoConstraints = false
        frameView.layer.borderColor = UIColor.white.withAlphaComponent(0.8).cgColor
        frameView.layer.borderWidth = 2
        frameView.layer.cornerRadius = 12
        frameView.backgroundColor = UIColor.clear
        view.addSubview(frameView)

        NSLayoutConstraint.activate([
            frameView.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            frameView.centerYAnchor.constraint(equalTo: view.centerYAnchor),
            frameView.widthAnchor.constraint(equalTo: view.widthAnchor, multiplier: 0.75),
            frameView.heightAnchor.constraint(equalTo: frameView.widthAnchor),
        ])
    }

    @objc private func cancelTapped() {
        guard !didFinish else { return }
        didFinish = true
        onCancel?()
    }

    func metadataOutput(_ output: AVCaptureMetadataOutput,
                        didOutput metadataObjects: [AVMetadataObject],
                        from connection: AVCaptureConnection) {
        guard !didFinish else { return }
        for obj in metadataObjects {
            guard let readable = obj as? AVMetadataMachineReadableCodeObject else { continue }
            guard readable.type == .qr else { continue }
            guard let value = readable.stringValue, !value.isEmpty else { continue }
            didFinish = true
            updateStatus("QR detected")
            onResult?(value)
            return
        }
    }
}

