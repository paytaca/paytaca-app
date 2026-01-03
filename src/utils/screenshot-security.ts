import { registerPlugin } from '@capacitor/core'

export interface ScreenshotSecurityPlugin {
  setSecureFlag(options: { enabled: boolean }): Promise<{ success: boolean; enabled: boolean }>
  isSecureFlagEnabled(): Promise<{ enabled: boolean }>
}

const ScreenshotSecurity = registerPlugin<ScreenshotSecurityPlugin>('ScreenshotSecurity', {
  web: () => import('./screenshot-security-web').then(m => new m.ScreenshotSecurityWeb())
})

export default ScreenshotSecurity

