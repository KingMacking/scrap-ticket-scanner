/**
 * Preprocesa una imagen antes de enviarsela a Tesseract.
 * Solo upscale + escala de grises, sin binarización.
 * La binarización agresiva destruye texto manuscrito con tinta de color.
 */
export function preprocessImage(dataUrl: string, scale = 2.5): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const w = img.naturalWidth * scale
      const h = img.naturalHeight * scale

      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')!

      // Upscale
      ctx.drawImage(img, 0, 0, w, h)

      const imageData = ctx.getImageData(0, 0, w, h)
      const data = imageData.data

      // Solo escala de grises — sin umbral, sin binarización
      for (let i = 0; i < data.length; i += 4) {
        const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2])
        data[i] = gray
        data[i + 1] = gray
        data[i + 2] = gray
      }

      ctx.putImageData(imageData, 0, 0)
      resolve(canvas.toDataURL('image/png'))
    }
    img.onerror = reject
    img.src = dataUrl
  })
}
