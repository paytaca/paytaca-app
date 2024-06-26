import crypto from 'crypto'
import { nativeFileAPI } from 'src/utils/native-file'

/**
 * @param {Object} opts
 * @param {File} opts.file
 * @param {Number} opts.maxWidthHeight
 * @returns {Promise<File>}
 */
export async function resizeImage(opts) {
  const file = opts?.file
  const maxWidthHeight = opts?.maxWidthHeight
  const image = await fileToImage(opts?.file)

  let width = image.width
  let height = image.height
  if (width > height) {
    const _width = Math.min(width, maxWidthHeight)
    const multiplier = _width/width
    height = height * multiplier
    width = _width
  } else {
    const _height = Math.min(height, maxWidthHeight)
    const multiplier = _height/height
    width = width * multiplier
    height = _height
  }

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = width
  canvas.height = height
  ctx.drawImage(image, 0, 0, width, height);
  return new Promise(resolve => {
    canvas.toBlob(blob => {
      const resizedFile = new nativeFileAPI.File([blob], file.name, { type: file.type })
      resolve(resizedFile)

      canvas.remove()
      image.remove()
    }, file.type)
  })
  
}

/**
 * @param {File} file 
 * @returns {Promise<Image>}
 */
export async function fileToImage(file) {
  return new Promise((resolve, reject) => {
    const fileReader = new nativeFileAPI.FileReader()
    fileReader.addEventListener('load', () => {
      const image = new Image();
      image.addEventListener('load', () => {
        resolve(image)
      })
      image.addEventListener('error', reject)
      image.src = fileReader.result
    })
    fileReader.addEventListener('error', reject)
    fileReader.readAsDataURL(file)
  })
}


/**
 * @param {String} base64 
 * @returns {File}
 */
export function base64ImageToFile(base64) {
  const dataBin = Buffer.from(base64, 'base64')
  const fileHash = crypto.createHash('sha256').update(dataBin).digest().toString('hex')
  return new nativeFileAPI.File([dataBin], fileHash)
}

export function dataUrlToFile(dataUrl) {
  const arr = dataUrl.split(',')
  const mime = arr[0].match(/:(.*?);/)[1]
  const dataBin = Buffer.from(arr[arr.length - 1], 'base64')
  const fileHash = crypto.createHash('sha256').update(dataBin).digest().toString('hex')
  return new nativeFileAPI.File([dataBin], fileHash, {type:mime});
}
