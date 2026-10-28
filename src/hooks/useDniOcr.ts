import { useState, useCallback } from 'react'
import type { OcrStatus } from '@/types/ticket'

export interface DniData {
  dni: string
  name: string
  address: string
}

// El domicilio es texto chico: 800 px no alcanza
const MAX_PX = 1600

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
      resolve(canvas.toDataURL('image/jpeg', 0.9))
    }
    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = dataUrl
  })
}

const PROMPT = `You are an OCR assistant. The image is the BACK of an Argentine DNI (Documento Nacional de Identidad).

Extract exactly these three fields and return ONLY a valid JSON object, no other text:
{"dni":"...","name":"...","address":"..."}

Rules:
- dni: the 8-digit document number. Prefer the MRZ first line: it starts with "IDARG" followed by the number (e.g. "IDARG99999999<4" -> "99999999"). Return digits only, no dots or spaces.
- name: surname(s) + given name(s) as printed in the "Apellido/s" and "Nombres" fields. Join them with a single space and keep the original uppercase, e.g. "GONZALEZ RODRIGUEZ MARIANA FLORENCIA".
- address: the full "Domicilio" block, exactly as printed, joined into ONE single line separated by commas, e.g. "SAN MARTIN 2538, CAÑUELAS - CAÑUELAS - BUENOS AIRES". Do not normalize, abbreviate, add or invent anything.
- If a field is not visible or not legible, use "" for that field. Never invent or guess data.
- Do not return CUIL, trámite number, birth date, place of birth or any other field.
- Keep accents (Á, É, Í, Ó, Ú, Ñ) as printed.`

function extractJsonObject(text: string): Record<string, unknown> {
  const stripped = text.replace(/```(?:json)?/gi, '').replace(/```/g, '').trim()
  const start = stripped.indexOf('{')
  const end = stripped.lastIndexOf('}')
  const json = start !== -1 && end !== -1 ? stripped.slice(start, end + 1) : stripped
  return JSON.parse(json)
}

export function useDniOcr() {
  const [status, setStatus] = useState<OcrStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)

  const recognize = useCallback(async (imageDataUrl: string): Promise<DniData | null> => {
    setStatus('processing')
    setError(null)
    setProgress(10)

    try {
      setProgress(30)
      const resized = await resizeImage(imageDataUrl)

      setProgress(60)

      let res: Response
      if (import.meta.env.PROD) {
        res = await fetch('/api/dni-ocr', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageDataUrl: resized }),
        })
      } else {
        const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string | undefined
        if (!apiKey) throw new Error('Falta VITE_GEMINI_API_KEY en .env')
        const base64 = resized.split(',')[1]
        const mimeType = resized.split(';')[0].replace('data:', '')

        res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{
                parts: [
                  { inline_data: { mime_type: mimeType, data: base64 } },
                  { text: PROMPT },
                ],
              }],
              generationConfig: {
                temperature: 0,
                response_mime_type: 'application/json',
              },
            }),
          }
        )
      }

      setProgress(85)

      if (!res.ok) throw new Error(`El servicio de lectura respondió ${res.status}`)

      const data = await res.json()
      const text: string = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
      const obj = extractJsonObject(text)

      const result: DniData = {
        dni: String(obj.dni ?? '').replace(/\D/g, '').slice(0, 8),
        name: String(obj.name ?? '').trim(),
        address: String(obj.address ?? '').trim(),
      }

      setProgress(100)
      setStatus('done')
      return result
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo leer el DNI')
      setStatus('error')
      return null
    }
  }, [])

  const reset = useCallback(() => {
    setStatus('idle')
    setError(null)
    setProgress(0)
  }, [])

  return { status, error, progress, recognize, reset }
}
