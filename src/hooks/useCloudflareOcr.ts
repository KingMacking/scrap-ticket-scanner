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

interface CfaRow {
  material: string
  weight: number
}

function buildOcrResult(rows: CfaRow[]): OcrResult {
  const items = MATERIALS.map((mat) => {
    const row = rows.find((r) => matchMaterial(r.material) === mat.name)
    return { materialName: mat.name, detectedWeight: row ? row.weight : null }
  })
  return { items, rawText: JSON.stringify(rows, null, 2) }
}

export function useCloudflareOcr() {
  const [status, setStatus] = useState<OcrStatus>('idle')
  const [result, setResult] = useState<OcrResult | null>(null)
  const [progress, setProgress] = useState(0)

  const recognize = useCallback(async (imageDataUrl: string) => {
    const isProd = import.meta.env.PROD
    const apiToken = import.meta.env.VITE_CLOUDFLARE_API_TOKEN as string | undefined
    const accountId = import.meta.env.VITE_CLOUDFLARE_ACCOUNT_ID as string | undefined

    if (!isProd && (!apiToken || !accountId)) {
      console.error('[Cloudflare] Faltan VITE_CLOUDFLARE_API_TOKEN y/o VITE_CLOUDFLARE_ACCOUNT_ID en .env')
      setStatus('error')
      return
    }

    setStatus('processing')
    setProgress(10)
    setResult(null)

    try {
      setProgress(30)
      const resized = await resizeImage(imageDataUrl)

      setProgress(60)

      let res: Response
      if (isProd) {
        res = await fetch('/api/cloudflare-ocr', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageDataUrl: resized }),
        })
      } else {
        res = await fetch(
          `/api/cf/accounts/${accountId}/ai/run/@cf/meta/llama-3.2-11b-vision-instruct`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${apiToken}`,
            },
            body: JSON.stringify({
              messages: [
                {
                  role: 'user',
                  content: [
                    { type: 'image_url', image_url: { url: resized } },
                    { type: 'text', text: PROMPT },
                  ],
                },
              ],
              max_tokens: 512,
            }),
          }
        )
      }

      setProgress(80)

      if (!res.ok) {
        const err = await res.json()
        console.error('[Cloudflare] API error:', err)
        setStatus('error')
        return
      }

      const data = await res.json()
      console.log('[Cloudflare full response]', data)

      if (!data.success) {
        console.error('[Cloudflare] API error:', data.errors)
        setStatus('error')
        return
      }

      const rawResponse = data.result?.response

      let rows: CfaRow[]
      if (Array.isArray(rawResponse)) {
        rows = rawResponse
      } else if (typeof rawResponse === 'string') {
        const stripped = rawResponse.replace(/```(?:json)?/g, '').replace(/```/g, '').trim()
        const start = stripped.indexOf('[')
        const end = stripped.lastIndexOf(']')
        const json = start !== -1 && end !== -1 ? stripped.slice(start, end + 1) : stripped
        rows = JSON.parse(json)
      } else {
        console.error('[Cloudflare] Unexpected response format:', rawResponse)
        setStatus('error')
        return
      }
      const ocrResult = buildOcrResult(rows)
      console.log('[Cloudflare parsed items]', ocrResult.items)

      setResult(ocrResult)
      setStatus('done')
      setProgress(100)
    } catch (err) {
      console.error('[Cloudflare] Error:', err)
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
