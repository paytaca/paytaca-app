import { registerPlugin } from '@capacitor/core'

export interface AudioModePlugin {
  isSilentOrDnd(): Promise<{ isSilentOrDnd: boolean; ringerMode?: number; isDnd?: boolean }>
}

const AudioMode = registerPlugin<AudioModePlugin>('AudioMode', {
  web: () => import('./audio-mode-web').then(m => new m.AudioModeWeb())
})

export default AudioMode