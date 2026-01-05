import { WebPlugin } from '@capacitor/core'
import type { ScreenshotSecurityPlugin } from './screenshot-security'

export class ScreenshotSecurityWeb extends WebPlugin implements ScreenshotSecurityPlugin {
  async setSecureFlag(options: { enabled: boolean }): Promise<{ success: boolean; enabled: boolean }> {
    // Web doesn't support screenshot prevention
    return { success: true, enabled: options.enabled }
  }

  async isSecureFlagEnabled(): Promise<{ enabled: boolean }> {
    // Web doesn't support screenshot prevention
    return { enabled: false }
  }
}

