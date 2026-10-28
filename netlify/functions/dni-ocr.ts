// Netlify function: extrae DNI, nombre y domicilio del dorso de un DNI argentino.
// Mismo patrón que gemini-ocr.ts. Usa GEMINI_API_KEY (ya configurada).

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

export default async (req: Request) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...headers, 'Content-Type': 'application/json' },
    })
  }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: 'Missing GEMINI_API_KEY' }),
      { status: 500, headers: { ...headers, 'Content-Type': 'application/json' } }
    )
  }

  try {
    const { imageDataUrl } = await req.json()
    if (!imageDataUrl) {
      return new Response(
        JSON.stringify({ error: 'Missing imageDataUrl' }),
        { status: 400, headers: { ...headers, 'Content-Type': 'application/json' } }
      )
    }

    const base64 = imageDataUrl.split(',')[1]
    const mimeType = imageDataUrl.split(';')[0].replace('data:', '')

    const geminiRes = await fetch(
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

    const data = await geminiRes.json()

    return new Response(JSON.stringify(data), {
      status: geminiRes.ok ? 200 : geminiRes.status,
      headers: { ...headers, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...headers, 'Content-Type': 'application/json' } }
    )
  }
}
