import { WebPlugin } from '@capacitor/core'
import type { AudioModePlugin } from './audio-mode'

export class AudioModeWeb extends WebPlugin implements AudioModePlugin {
  async isSilentOrDnd(): Promise<{ isSilentOrDnd: boolean; ringerMode?: number; isDnd?: boolean }> {
    return { isSilentOrDnd: false }
  }
}