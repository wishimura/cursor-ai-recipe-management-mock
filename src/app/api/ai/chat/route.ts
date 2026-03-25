import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
}

function buildDemoResponse(message: string): string {
  const lower = message.toLowerCase()

  if (lower.includes('原価率') && lower.includes('高い')) {
    return `現在のデータを分析した結果、以下のメニューの原価率が高い傾向にあります：

1. 特選和牛ステーキ - 原価率 45%
2. 海鮮盛り合わせ - 原価率 42%
3. フォアグラのソテー - 原価率 40%

業界平均の原価率は30%前後です。これらのメニューの価格設定や食材調達先の見直しをお勧めします。`
  }

  if (lower.includes('改善')) {
    return `原価率を改善するための主な方法をご提案します：

1. **仕入れ先の見直し** - 複数の業者から見積もりを取り、価格交渉を行いましょう
2. **ポーション管理** - 食材の使用量を標準化し、ロスを削減します
3. **メニュー構成の最適化** - 原価率の低いメニューを増やし、高いものはセットメニューに組み込みます
4. **在庫管理の徹底** - 廃棄ロスを減らすため、先入先出を徹底しましょう
5. **季節食材の活用** - 旬の食材は安く仕入れられます

まずは原価率が35%を超えているメニューから見直すことをお勧めします。`
  }

  if (lower.includes('今月') || lower.includes('分析')) {
    return `今月の原価分析サマリーです：

- 月間売上: ¥2,450,000
- 仕入額: ¥780,000
- 原価率: 31.8%（前月比 -0.5%）

前月と比較して原価率が改善傾向にあります。特に野菜類の仕入れコスト削減が効いています。

引き続き食材ロスの削減に注力することで、目標の30%以下を達成できる見込みです。`
  }

  return `ご質問ありがとうございます。原価管理に関するご相談を承ります。

以下のような質問にお答えできます：
- 原価率の高いメニューの特定
- 原価率改善のアドバイス
- 月次の原価分析
- 食材コストの最適化提案

お気軽にご質問ください。`
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { message, history = [] } = body as {
      message: string
      history: ChatMessage[]
    }

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'メッセージが必要です' },
        { status: 400 }
      )
    }

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      const demoResponse = buildDemoResponse(message)
      return NextResponse.json({ response: demoResponse })
    }

    // Authenticate user and get org data
    const supabase = createServerSupabaseClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      // Return demo response for unauthenticated users
      const demoResponse = buildDemoResponse(message)
      return NextResponse.json({ response: demoResponse })
    }

    // Get user profile for org_id
    const { data: profile } = await supabase
      .from('profiles')
      .select('org_id')
      .eq('id', user.id)
      .single()

    const orgId = profile?.org_id

    // Fetch restaurant data for context
    let contextData = ''

    if (orgId) {
      const [recipesResult, analysisResult, ingredientsResult] =
        await Promise.all([
          supabase
            .from('recipes')
            .select('name, category, selling_price, cost, cost_rate')
            .eq('org_id', orgId)
            .order('cost_rate', { ascending: false })
            .limit(20),
          supabase
            .from('monthly_analyses')
            .select('*')
            .eq('org_id', orgId)
            .order('year_month', { ascending: false })
            .limit(6),
          supabase
            .from('ingredients')
            .select('name, unit, purchase_price, unit_cost')
            .eq('org_id', orgId)
            .order('unit_cost', { ascending: false })
            .limit(20),
        ])

      if (recipesResult.data && recipesResult.data.length > 0) {
        contextData += '\n【登録メニュー（原価率順）】\n'
        recipesResult.data.forEach((r) => {
          contextData += `- ${r.name}（${r.category}）: 売価¥${r.selling_price}, 原価¥${r.cost}, 原価率${r.cost_rate}%\n`
        })
      }

      if (analysisResult.data && analysisResult.data.length > 0) {
        contextData += '\n【月次原価分析（直近6ヶ月）】\n'
        analysisResult.data.forEach((a) => {
          contextData += `- ${a.year_month}: 売上¥${a.monthly_sales}, 仕入¥${a.purchase_amount}, 原価率${a.cost_rate}%\n`
        })
      }

      if (ingredientsResult.data && ingredientsResult.data.length > 0) {
        contextData += '\n【主要食材（単価順）】\n'
        ingredientsResult.data.forEach((i) => {
          contextData += `- ${i.name}: 仕入単価¥${i.purchase_price}/${i.unit}, 使用単価¥${i.unit_cost}\n`
        })
      }
    }

    const systemPrompt = `あなたは飲食店の原価管理アシスタントです。ユーザーの質問に対して、具体的で実用的なアドバイスを日本語で提供してください。

以下はこの店舗の実際のデータです：
${contextData || '（データがまだ登録されていません。一般的なアドバイスを提供してください。）'}

回答のガイドライン：
- 具体的な数値やデータに基づいて回答してください
- 飲食業界の一般的な基準（原価率30%前後）と比較してアドバイスしてください
- 改善提案は実行可能な具体的なアクションを含めてください
- 丁寧ですが簡潔に回答してください
- 必要に応じて箇条書きや構造的な形式を使用してください`

    const apiMessages = [
      ...history.map((m) => ({ role: m.role, content: m.content })),
      { role: 'user' as const, content: message },
    ]

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        system: systemPrompt,
        messages: apiMessages,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Anthropic API error:', response.status, errorText)

      // Fallback to demo response on API error
      const demoResponse = buildDemoResponse(message)
      return NextResponse.json({ response: demoResponse })
    }

    const data = await response.json()
    const assistantMessage =
      data.content?.[0]?.text ?? 'レスポンスの取得に失敗しました。'

    return NextResponse.json({ response: assistantMessage })
  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}
