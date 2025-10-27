import { WebPlugin } from '@capacitor/core'
import type { SaveToGalleryPlugin } from './save-to-gallery'

export class SaveToGalleryWeb extends WebPlugin implements SaveToGalleryPlugin {
  async saveImage(options: { base64Data: string; filename: string }): Promise<{ filePath: string }> {
    // Web implementation - download file
    const blob = this.base64toBlob(options.base64Data, 'image/png')
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = options.filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    
    return { filePath: options.filename }
  }

  private base64toBlob(base64Data: string, contentType: string): Blob {
    const byteCharacters = atob(base64Data)
    const byteArrays = []

    for (let offset = 0; offset < byteCharacters.length; offset += 512) {
      const slice = byteCharacters.slice(offset, offset + 512)
      const byteNumbers = new Array(slice.length)
      
      for (let i = 0; i < slice.length; i++) {
        byteNumbers[i] = slice.charCodeAt(i)
      }
      
      const byteArray = new Uint8Array(byteNumbers)
      byteArrays.push(byteArray)
    }

    return new Blob(byteArrays, { type: contentType })
  }
}

