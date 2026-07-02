import { useState, useCallback } from 'react'
import type { OcrResult, OcrStatus } from '@/types/ticket'
import { MATERIALS } from '@/data/materials'

const PROMPT = `This image contains a handwritten table with two columns: MATERIAL and PESO (weight).
Extract all rows that have both a material name and a numeric weight.

Respond ONLY with a valid JSON array, no markdown, no explanation. Format:
[{"material": "COBRE", "weight": 200}, {"material": "HIERRO", "weight": 150}]

Use the exact material name as written in the image. If a row has no weight, skip it.`

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
        model: 'qwen/qwen3.6-27b',
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

      const clean = text.replace(/<think>[\s\S]*?<\/think>/g, '').replace(/```(?:json)?/g, '').replace(/```/g, '').trim()
      const rows: OcrRow[] = JSON.parse(clean)
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
