export interface EscrowKeyPlugin {
  /**
   * Whether a portable escrow is available on this device/account
   * (iOS: iCloud Keychain enabled; Android: Play services + device lock).
   */
  isAvailable(): Promise<{ value: boolean }>;

  /**
   * Read a value. `value` is null when the key is absent.
   */
  get(options: { key: string }): Promise<{ value: string | null }>;

  /**
   * Write a value. Returns true on success.
   */
  set(options: { key: string; value: string }): Promise<{ value: boolean }>;

  /**
   * Remove a value. Returns true on success (or when already absent).
   */
  remove(options: { key: string }): Promise<{ value: boolean }>;
}

export declare const EscrowKey: EscrowKeyPlugin;
export default EscrowKey;
