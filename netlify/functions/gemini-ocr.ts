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

    const PROMPT = `You are an OCR assistant. Extract rows from a handwritten table with columns MATERIAL and PESO (weight in kg).

Rules:
- Return ONLY a valid JSON array, no other text.
- Each entry: {"material": "exact name as written", "weight": number}
- Skip rows without a weight number.
- Use the exact material name from the image, do not translate or normalize.

Example: [{"material": "COBRE", "weight": 200}, {"material": "HIERRO", "weight": 150}]`

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
