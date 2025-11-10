import { registerPlugin } from '@capacitor/core'

export interface SaveToGalleryPlugin {
  saveImage(options: { base64Data: string; filename: string }): Promise<{ filePath: string }>
}

const SaveToGallery = registerPlugin<SaveToGalleryPlugin>('SaveToGallery', {
  web: () => import('./save-to-gallery-web').then(m => new m.SaveToGalleryWeb())
})

export default SaveToGallery

