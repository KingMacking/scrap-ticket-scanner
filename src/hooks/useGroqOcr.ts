import { useState, useCallback } from 'react'
import type { OcrResult, OcrStatus } from '@/types/ticket'
import { MATERIALS } from '@/data/materials'

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

interface OcrRow {
  material: string
  weight: number
}

function buildOcrResult(rows: OcrRow[]): OcrResult {
  const items = MATERIALS.map((mat) => {
    const row = rows.find((r) => matchMaterial(r.material) === mat.name)
    return { materialName: mat.name, detectedWeight: row ? row.weight : null }
  })
  return { items, rawText: JSON.stringify(rows, null, 2) }
}

export function useGroqOcr() {
  const [status, setStatus] = useState<OcrStatus>('idle')
  const [result, setResult] = useState<OcrResult | null>(null)
  const [progress, setProgress] = useState(0)

  const recognize = useCallback(async (imageDataUrl: string) => {
    const apiKey = import.meta.env.VITE_GROQ_API_KEY as string | undefined
    if (!apiKey) {
      console.error('[Groq] Falta VITE_GROQ_API_KEY en .env')
      setStatus('error')
      return
    }

    setStatus('processing')
    setProgress(10)
    setResult(null)

    try {
      setProgress(30)

      const body = {
        model: 'meta-llama/llama-4-scout-17b-16e-instruct',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: { url: imageDataUrl },
              },
              {
                type: 'text',
                text: PROMPT,
              },
            ],
          },
        ],
        temperature: 0,
      }

      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
      })

      setProgress(80)

      if (!res.ok) {
        const err = await res.json()
        console.error('[Groq] API error:', err)
        setStatus('error')
        return
      }

      const data = await res.json()
      const text: string = data.choices?.[0]?.message?.content ?? ''
      console.log('[Groq raw response]', text)

      const stripped = text.replace(/<think>[\s\S]*?<\/think>/g, '').replace(/```(?:json)?/g, '').replace(/```/g, '').trim()
      const start = stripped.indexOf('[')
      const end = stripped.lastIndexOf(']')
      const json = start !== -1 && end !== -1 ? stripped.slice(start, end + 1) : stripped
      const rows: OcrRow[] = JSON.parse(json)
      const ocrResult = buildOcrResult(rows)
      console.log('[Groq parsed items]', ocrResult.items)

      setResult(ocrResult)
      setStatus('done')
      setProgress(100)
    } catch (err) {
      console.error('[Groq] Error:', err)
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
