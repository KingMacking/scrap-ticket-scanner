import { useState, useCallback } from 'react'
import type { OcrResult, OcrStatus } from '@/types/ticket'
import { MATERIALS } from '@/data/materials'

const MAX_PX = 800

function resizeImage(dataUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      let { width, height } = img
      if (width <= MAX_PX && height <= MAX_PX) {
        resolve(dataUrl)
        return
      }
      const scale = Math.min(MAX_PX / width, MAX_PX / height)
      width = Math.round(width * scale)
      height = Math.round(height * scale)
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      canvas.getContext('2d')!.drawImage(img, 0, 0, width, height)
      resolve(canvas.toDataURL('image/jpeg', 0.8))
    }
    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = dataUrl
  })
}

const PROMPT = `You are an OCR assistant. Extract rows from a handwritten table with columns MATERIAL and PESO (weight in kg).

Rules:
- Return ONLY a valid JSON array, no other text.
- Each entry: {"material": "exact name as written", "weight": number}
- Skip rows without a weight number.
- Use the exact material name from the image, do not translate or normalize.

Example: [{"material": "COBRE", "weight": 200}, {"material": "HIERRO", "weight": 150}]`

function matchMaterial(raw: string): string {
  const lower = raw.toLowerCase()
  const found = MATERIALS.find((m) =>
    m.aliases.some((alias) => lower.includes(alias))
  )
  return found?.name ?? raw
}

interface GeminiRow {
  material: string
  weight: number
}

function buildOcrResult(rows: GeminiRow[]): OcrResult {
  const items = MATERIALS.map((mat) => {
    const row = rows.find((r) => matchMaterial(r.material) === mat.name)
    return { materialName: mat.name, detectedWeight: row ? row.weight : null }
  })
  return { items, rawText: JSON.stringify(rows, null, 2) }
}

export function useGeminiOcr() {
  const [status, setStatus] = useState<OcrStatus>('idle')
  const [result, setResult] = useState<OcrResult | null>(null)
  const [progress, setProgress] = useState(0)

  const recognize = useCallback(async (imageDataUrl: string) => {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string | undefined
    if (!apiKey) {
      console.error('[Gemini] Falta VITE_GEMINI_API_KEY en .env')
      setStatus('error')
      return
    }

    setStatus('processing')
    setProgress(10)
    setResult(null)

    try {
      setProgress(30)
      const resized = await resizeImage(imageDataUrl)
      const base64 = resized.split(',')[1]
      const mimeType = resized.split(';')[0].replace('data:', '')

      const body = {
        contents: [{
          parts: [
            { inline_data: { mime_type: mimeType, data: base64 } },
            { text: PROMPT },
          ],
        }],
        generationConfig: {
          temperature: 0,
          response_mime_type: 'application/json',
          thinkingConfig: { thinkingBudget: 0 },
        },
      }

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${apiKey}`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
      )

      setProgress(80)

      if (!res.ok) {
        const err = await res.json()
        console.error('[Gemini] API error:', err)
        setStatus('error')
        return
      }

      const data = await res.json()
      const text: string = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
      console.log('[Gemini raw response]', text)

      const stripped = text.replace(/```(?:json)?/g, '').replace(/```/g, '').trim()
      const start = stripped.indexOf('[')
      const end = stripped.lastIndexOf(']')
      const json = start !== -1 && end !== -1 ? stripped.slice(start, end + 1) : stripped
      const rows: GeminiRow[] = JSON.parse(json)
      const ocrResult = buildOcrResult(rows)
      console.log('[Gemini parsed items]', ocrResult.items)

      setResult(ocrResult)
      setStatus('done')
      setProgress(100)
    } catch (err) {
      console.error('[Gemini] Error:', err)
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
