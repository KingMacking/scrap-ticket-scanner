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

  const apiToken = process.env.CLOUDFLARE_API_TOKEN
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID
  if (!apiToken || !accountId) {
    return new Response(
      JSON.stringify({ error: 'Missing Cloudflare credentials' }),
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

    const PROMPT = `You are an OCR assistant. Extract rows from a handwritten table with columns MATERIAL and PESO (weight in kg).

Rules:
- Return ONLY a valid JSON array, no other text.
- Each entry: {"material": "exact name as written", "weight": number}
- Skip rows without a weight number.
- Use the exact material name from the image, do not translate or normalize.

Example: [{"material": "COBRE", "weight": 200}, {"material": "HIERRO", "weight": 150}]`

    const cfRes = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/@cf/meta/llama-3.2-11b-vision-instruct`,
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
                { type: 'image_url', image_url: { url: imageDataUrl } },
                { type: 'text', text: PROMPT },
              ],
            },
          ],
          max_tokens: 512,
        }),
      }
    )

    const data = await cfRes.json()

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { ...headers, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...headers, 'Content-Type': 'application/json' } }
    )
  }
}
