import { NextRequest, NextResponse } from 'next/server'

type OcrResultItem = {
  name: string
  quantity: number
  unit: string
  unit_cost: number
  amount: number
}

const DEMO_ITEMS: OcrResultItem[] = [
  { name: '仙台牛ブリスケ', quantity: 5000, unit: 'g', unit_cost: 4.8, amount: 24000 },
  { name: '国産牛ハラミ', quantity: 3000, unit: 'g', unit_cost: 6.8, amount: 20400 },
  { name: '仙台牛シンタマ', quantity: 2000, unit: 'g', unit_cost: 5.6, amount: 11200 },
  { name: '国産牛ゲンコツカット', quantity: 5000, unit: 'g', unit_cost: 0.23, amount: 1150 },
  { name: '国産鶏ガラ', quantity: 3000, unit: 'g', unit_cost: 0.3, amount: 900 },
  { name: '仙台牛スネ', quantity: 2000, unit: 'g', unit_cost: 1.85, amount: 3700 },
]

function detectMediaType(base64Data: string): string {
  if (base64Data.startsWith('/9j')) return 'image/jpeg'
  if (base64Data.startsWith('iVBOR')) return 'image/png'
  if (base64Data.startsWith('R0lGOD')) return 'image/gif'
  if (base64Data.startsWith('UklGR')) return 'image/webp'
  return 'image/png'
}

function extractJsonFromText(text: string): OcrResultItem[] | null {
  // Try to find a JSON array in the response text
  const jsonMatch = text.match(/\[[\s\S]*\]/)
  if (!jsonMatch) return null

  try {
    const parsed = JSON.parse(jsonMatch[0])
    if (!Array.isArray(parsed)) return null

    return parsed.map((item: Record<string, unknown>) => ({
      name: String(item.name || ''),
      quantity: Number(item.quantity) || 0,
      unit: String(item.unit || 'g'),
      unit_cost: Number(item.unit_cost) || 0,
      amount: Number(item.amount) || 0,
    }))
  } catch {
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { image } = body as { image?: string }

    const apiKey = process.env.ANTHROPIC_API_KEY

    // If no API key or no image, return demo data
    if (!apiKey || !image) {
      return NextResponse.json({ items: DEMO_ITEMS })
    }

    // Strip data URL prefix if present (e.g. "data:image/png;base64,...")
    const base64Data = image.includes(',') ? image.split(',')[1] : image
    const mediaType = detectMediaType(base64Data)

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2048,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: mediaType,
                  data: base64Data,
                },
              },
              {
                type: 'text',
                text: `この納品書画像から食材の情報を読み取ってください。
以下のJSON配列形式で返してください。他のテキストは不要です。

[
  {
    "name": "品名",
    "quantity": 数量(数値),
    "unit": "単位(g, kg, 個, 枚, 本など)",
    "unit_cost": 単価(数値),
    "amount": 金額(数値)
  }
]

注意:
- 数量、単価、金額は数値型で返してください（カンマや¥記号は除く）
- 小計、消費税、合計行は含めないでください
- 品名は正確に読み取ってください`,
              },
            ],
          },
        ],
      }),
    })

    if (!response.ok) {
      console.error('Anthropic API error:', response.status, await response.text())
      // Fall back to demo data on API error
      return NextResponse.json({ items: DEMO_ITEMS })
    }

    const data = await response.json()
    const textContent = data.content?.[0]?.text

    if (!textContent) {
      return NextResponse.json({ items: DEMO_ITEMS })
    }

    const items = extractJsonFromText(textContent)

    if (!items || items.length === 0) {
      return NextResponse.json({ items: DEMO_ITEMS })
    }

    return NextResponse.json({ items })
  } catch (error) {
    console.error('OCR API error:', error)
    return NextResponse.json(
      { error: 'OCR処理中にエラーが発生しました', items: DEMO_ITEMS },
      { status: 500 }
    )
  }
}
