/**
 * Client-side image crop & resize utilities.
 * Crops the source image to the given pixel area, resizes to fit within
 * maxSize (default 1024), and converts to WebP.
 */

export interface CropArea {
  x: number
  y: number
  width: number
  height: number
}

const DEFAULT_MAX_SIZE = 1024
const DEFAULT_QUALITY = 0.85

export async function cropAndResizeImage(
  src: string,
  pixelCrop: CropArea,
  opts?: { maxSize?: number; quality?: number }
): Promise<Blob> {
  const maxSize = opts?.maxSize ?? DEFAULT_MAX_SIZE
  const quality = opts?.quality ?? DEFAULT_QUALITY

  const image = new Image()
  image.crossOrigin = "anonymous"
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve()
    image.onerror = reject
    image.src = src
  })

  // Determine output size: fit within maxSize while preserving aspect ratio (1:1 crop)
  const cropW = pixelCrop.width
  const cropH = pixelCrop.height
  const scale = Math.min(1, maxSize / Math.max(cropW, cropH))
  const outW = Math.round(cropW * scale)
  const outH = Math.round(cropH * scale)

  const canvas = document.createElement("canvas")
  canvas.width = outW
  canvas.height = outH
  const ctx = canvas.getContext("2d")!
  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    cropW,
    cropH,
    0,
    0,
    outW,
    outH
  )

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Canvas toBlob failed"))),
      "image/webp",
      quality
    )
  })
}

/**
 * Resize an image to fit within maxWidth (maintaining aspect ratio) and convert to WebP.
 * No cropping is performed — the full image is used.
 */
export async function resizeImage(
  src: string,
  opts?: { maxWidth?: number; quality?: number }
): Promise<Blob> {
  const maxWidth = opts?.maxWidth ?? 1200
  const quality = opts?.quality ?? 0.85

  const image = new Image()
  image.crossOrigin = "anonymous"
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve()
    image.onerror = reject
    image.src = src
  })

  const scale = Math.min(1, maxWidth / image.naturalWidth)
  const outW = Math.round(image.naturalWidth * scale)
  const outH = Math.round(image.naturalHeight * scale)

  const canvas = document.createElement("canvas")
  canvas.width = outW
  canvas.height = outH
  const ctx = canvas.getContext("2d")!
  ctx.drawImage(image, 0, 0, outW, outH)

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Canvas toBlob failed"))),
      "image/webp",
      quality
    )
  })
}
