import Foundation
import Capacitor
import Security

@objc(EscrowKeyPlugin)
public class EscrowKeyPlugin: CAPPlugin {

    private let service = "cap_escrow"

    @objc func isAvailable(_ call: CAPPluginCall) {
        call.resolve(["value": true])
    }

    @objc func get(_ call: CAPPluginCall) {
        guard let key = call.getString("key") else {
            call.reject("key is required")
            return
        }

        var query = baseQuery(key: key)
        query[kSecReturnData as String] = kCFBooleanTrue
        query[kSecMatchLimit as String] = kSecMatchLimitOne

        var item: CFTypeRef?
        let status = SecItemCopyMatching(query as CFDictionary, &item)

        if status == errSecItemNotFound {
            call.resolve(["value": NSNull()])
            return
        }
        guard status == errSecSuccess, let data = item as? Data,
              let value = String(data: data, encoding: .utf8) else {
            call.reject("Escrow read failed (OSStatus \(status))")
            return
        }
        call.resolve(["value": value])
    }

    @objc func set(_ call: CAPPluginCall) {
        guard let key = call.getString("key"), let value = call.getString("value") else {
            call.reject("key and value are required")
            return
        }
        guard let data = value.data(using: .utf8) else {
            call.reject("value is not valid UTF-8")
            return
        }

        let query = baseQuery(key: key)
        let attributes: [String: Any] = [kSecValueData as String: data]
        let updateStatus = SecItemUpdate(query as CFDictionary, attributes as CFDictionary)

        if updateStatus == errSecSuccess {
            call.resolve(["value": true])
            return
        }
        if updateStatus == errSecItemNotFound {
            var addQuery = query
            addQuery[kSecValueData as String] = data
            addQuery[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlock
            let addStatus = SecItemAdd(addQuery as CFDictionary, nil)
            if addStatus == errSecSuccess {
                call.resolve(["value": true])
                return
            }
            call.reject("Escrow write failed (OSStatus \(addStatus))")
            return
        }
        call.reject("Escrow update failed (OSStatus \(updateStatus))")
    }

    @objc func remove(_ call: CAPPluginCall) {
        guard let key = call.getString("key") else {
            call.reject("key is required")
            return
        }

        let status = SecItemDelete(baseQuery(key: key) as CFDictionary)
        if status == errSecSuccess || status == errSecItemNotFound {
            call.resolve(["value": true])
            return
        }
        call.reject("Escrow delete failed (OSStatus \(status))")
    }

    private func baseQuery(key: String) -> [String: Any] {
        return [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
            kSecAttrSynchronizable as String: kCFBooleanTrue
        ]
    }
}
