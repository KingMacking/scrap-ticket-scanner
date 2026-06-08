import { useState, useCallback, useRef } from 'react'
import { createWorker, PSM } from 'tesseract.js'
import type { OcrResult, OcrStatus } from '@/types/ticket'
import { MATERIALS } from '@/data/materials'
import { preprocessImage } from '@/lib/preprocessImage'

/**
 * Parsea el texto crudo de Tesseract.
 *
 * Tesseract puede colocar el nombre del material y su peso en:
 * - La MISMA línea: "COBRE 200"
 * - LÍNEAS DISTINTAS: "COBRE\n200" (ocurre con PSM que separa columnas)
 *
 * Estrategia:
 * 1. Busca la línea que contiene un alias del material.
 * 2. Extrae el último número de esa línea.
 * 3. Si no hay número, mira la siguiente línea no vacía.
 */
function parseOcrText(raw: string): OcrResult['items'] {
  const lines = raw.split('\n').map((l) => l.trim()).filter(Boolean)

  return MATERIALS.map((material) => {
    const idx = lines.findIndex((l) => {
      const lower = l.toLowerCase()
      return material.aliases.some((alias) => lower.includes(alias))
    })

    if (idx === -1) return { materialName: material.name, detectedWeight: null }

    // Busca número en la misma línea o en las dos siguientes no vacías
    const candidates = [lines[idx], lines[idx + 1] ?? '', lines[idx + 2] ?? '']
    for (const line of candidates) {
      const matches = [...line.matchAll(/\b\d+(?:[.,]\d+)?\b/g)]
      if (matches.length === 0) continue
      const lastNum = matches[matches.length - 1][0].replace(',', '.')
      const weight = parseFloat(lastNum)
      if (weight >= 1) return { materialName: material.name, detectedWeight: weight }
    }

    return { materialName: material.name, detectedWeight: null }
  })
}

export function useOcr() {
  const [status, setStatus] = useState<OcrStatus>('idle')
  const [result, setResult] = useState<OcrResult | null>(null)
  const [progress, setProgress] = useState(0)
  const workerRef = useRef<Awaited<ReturnType<typeof createWorker>> | null>(null)

  const recognize = useCallback(async (imageDataUrl: string) => {
    setStatus('processing')
    setProgress(0)
    setResult(null)

    try {
      if (!workerRef.current) {
        workerRef.current = await createWorker('eng', 1, {
          logger: (m) => {
            if (m.status === 'recognizing text') {
              setProgress(Math.round((m.progress ?? 0) * 100))
            }
          },
        })
        // SPARSE_TEXT: mejor resultado observado hasta ahora con este ticket
        await workerRef.current.setParameters({
          tessedit_pageseg_mode: PSM.SPARSE_TEXT,
        })
      }

      // Preprocesar imagen
      const processed = await preprocessImage(imageDataUrl)
      console.log('[OCR] imagen preprocesada, enviando a Tesseract...')

      const { data } = await workerRef.current.recognize(processed)
      console.log('[OCR raw text]\n', data.text)
      const items = parseOcrText(data.text)
      console.log('[OCR parsed items]', items)

      setResult({ items, rawText: data.text })
      setStatus('done')
    } catch (err) {
      console.error('OCR error:', err)
      setStatus('error')
    }
  }, [])

  const reset = useCallback(() => {
    setStatus('idle')
    setResult(null)
    setProgress(0)
  }, [])

  return { status, result, progress, recognize, reset }
}
