import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'

type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
}

type RecipeData = {
  name: string
  category: string | null
  selling_price: number
  cost: number
  cost_rate: number
}

type AnalysisData = {
  year_month: string
  monthly_sales: number
  purchase_amount: number
  cost_rate: number
}

type IngredientData = {
  name: string
  unit: string
  purchase_price: number
  unit_cost: number
}

type RecipeItemData = {
  name: string
  quantity: number
  unit: string
  unit_cost: number
  cost: number
  recipe_name: string
}

async function fetchOrgData(orgId: string) {
  const supabase = createServiceRoleClient()

  const [recipesResult, analysisResult, ingredientsResult, recipeItemsResult] =
    await Promise.all([
      supabase
        .from('recipes')
        .select('name, category, selling_price, cost, cost_rate')
        .eq('org_id', orgId)
        .order('cost_rate', { ascending: false })
        .limit(20),
      supabase
        .from('monthly_analyses')
        .select('year_month, monthly_sales, purchase_amount, cost_rate')
        .eq('org_id', orgId)
        .order('year_month', { ascending: false })
        .limit(6),
      supabase
        .from('ingredients')
        .select('name, unit, purchase_price, unit_cost')
        .eq('org_id', orgId)
        .order('purchase_price', { ascending: false })
        .limit(30),
      supabase
        .from('recipe_items')
        .select('name, quantity, unit, unit_cost, cost, recipe:recipes!inner(name)')
        .eq('recipes.org_id', orgId),
    ])

  return {
    recipes: (recipesResult.data ?? []) as RecipeData[],
    analyses: (analysisResult.data ?? []) as AnalysisData[],
    ingredients: (ingredientsResult.data ?? []) as IngredientData[],
    recipeItems: (recipeItemsResult.data ?? []).map((item: Record<string, unknown>) => ({
      ...item,
      recipe_name: (item.recipe as Record<string, string>)?.name ?? '',
    })) as RecipeItemData[],
  }
}

function buildSmartResponse(
  message: string,
  data: Awaited<ReturnType<typeof fetchOrgData>>
): string {
  const lower = message.toLowerCase()
  const { recipes, analyses, ingredients, recipeItems } = data

  // 特定メニューのシミュレーション質問
  const menuMatch = recipes.find((r) =>
    lower.includes(r.name.toLowerCase()) || lower.includes(r.name)
  )

  if (menuMatch && (lower.includes('原価') || lower.includes('減価') || lower.includes('コスト'))) {
    const items = recipeItems.filter((ri) => ri.recipe_name === menuMatch.name)
    const priceMatch = message.match(/(\d+)\s*円/)
    const qtyMatch = message.match(/(\d+)\s*g/)

    // Calculate actual cost from recipe_items
    const actualCost = items.length > 0
      ? Math.round(items.reduce((sum, i) => sum + i.cost, 0))
      : menuMatch.cost
    const actualRate = ((actualCost / menuMatch.selling_price) * 100).toFixed(1)

    let response = `**${menuMatch.name}** の原価分析です：\n\n`
    response += `- 売価: ¥${menuMatch.selling_price.toLocaleString()}\n`
    response += `- 現在の原価: ¥${actualCost.toLocaleString()}\n`
    response += `- 現在の原価率: ${actualRate}%\n\n`

    if (items.length > 0) {
      response += `**材料内訳:**\n`
      items.forEach((item) => {
        response += `- ${item.name}: ${item.quantity}${item.unit} × ¥${item.unit_cost} = ¥${Math.round(item.cost).toLocaleString()}\n`
      })
      response += '\n'
    }

    // If user asks "what if X costs Y yen" or "what if quantity changes"
    if (priceMatch || qtyMatch) {
      const ingredientMentioned = ingredients.find((i) =>
        lower.includes(i.name.toLowerCase()) || lower.includes(i.name)
      )
      const itemInRecipe = items.find((i) =>
        lower.includes(i.name.toLowerCase()) || lower.includes(i.name)
      )

      if (itemInRecipe) {
        let newItemCost = itemInRecipe.cost
        if (priceMatch) {
          const newPrice = parseInt(priceMatch[1])
          if (qtyMatch) {
            newItemCost = newPrice // price already includes quantity
          } else {
            newItemCost = newPrice * itemInRecipe.quantity
          }
        } else if (qtyMatch) {
          newItemCost = parseInt(qtyMatch[1]) * itemInRecipe.unit_cost
        }

        const otherCost = items
          .filter((i) => i.name !== itemInRecipe.name)
          .reduce((sum, i) => sum + i.cost, 0)
        const newTotalCost = Math.round(otherCost + newItemCost)
        const newCostRate = ((newTotalCost / menuMatch.selling_price) * 100).toFixed(1)

        response += `**シミュレーション結果:**\n`
        response += `- ${itemInRecipe.name}の原価変更: ¥${Math.round(itemInRecipe.cost)} → ¥${Math.round(newItemCost)}\n`
        response += `- 新しい原価合計: ¥${newTotalCost.toLocaleString()}\n`
        response += `- 新しい原価率: **${newCostRate}%**（現在${actualRate}%）\n`

        const diff = parseFloat(newCostRate) - parseFloat(actualRate)
        if (diff > 0) {
          response += `\n⚠️ 原価率が${diff.toFixed(1)}ポイント上昇します。`
          if (parseFloat(newCostRate) > 35) {
            response += `業界基準の35%を超えるため、売価の見直しもご検討ください。`
          }
        } else {
          response += `\n✅ 原価率が${Math.abs(diff).toFixed(1)}ポイント改善します。`
        }
        return response
      }
    }

    return response
  }

  // 原価率が高いメニュー
  if ((lower.includes('原価率') || lower.includes('減価率')) && (lower.includes('高い') || lower.includes('ランキング') || lower.includes('トップ'))) {
    if (recipes.length === 0) return 'メニューデータがまだ登録されていません。レシピを登録してください。'

    const sorted = [...recipes].sort((a, b) => b.cost_rate - a.cost_rate)
    const top5 = sorted.slice(0, 5)
    let response = '**原価率の高いメニュー TOP5:**\n\n'
    top5.forEach((r, i) => {
      const status = r.cost_rate > 35 ? '⚠️' : r.cost_rate > 30 ? '🔶' : '✅'
      response += `${i + 1}. ${status} **${r.name}**（${r.category ?? '未分類'}）\n`
      response += `   売価¥${r.selling_price.toLocaleString()} / 原価¥${r.cost.toLocaleString()} / 原価率 **${r.cost_rate}%**\n\n`
    })

    const highCount = recipes.filter((r) => r.cost_rate > 35).length
    if (highCount > 0) {
      response += `\n${highCount}品が原価率35%を超えています。売価の見直しや食材の代替を検討してください。`
    } else {
      response += '\nすべてのメニューが35%以下で良好です。'
    }
    return response
  }

  // 原価率改善アドバイス
  if (lower.includes('改善') || lower.includes('下げ') || lower.includes('削減')) {
    const highCostRecipes = recipes.filter((r) => r.cost_rate > 30).slice(0, 3)
    const expensiveIngredients = [...ingredients].sort((a, b) => b.purchase_price - a.purchase_price).slice(0, 5)

    let response = '**原価率改善のご提案:**\n\n'

    if (highCostRecipes.length > 0) {
      response += '**1. 原価率の高いメニューの見直し**\n'
      highCostRecipes.forEach((r) => {
        response += `- ${r.name}: 原価率${r.cost_rate}% → 売価を¥${Math.round(r.cost / 0.3).toLocaleString()}にすれば30%に\n`
      })
      response += '\n'
    }

    if (expensiveIngredients.length > 0) {
      response += '**2. 高単価食材の仕入れ見直し**\n'
      expensiveIngredients.forEach((i) => {
        response += `- ${i.name}: ¥${i.purchase_price.toLocaleString()}/${i.unit}\n`
      })
      response += '\n'
    }

    response += '**3. その他の施策**\n'
    response += '- ポーション管理の標準化でロス削減\n'
    response += '- 季節食材の活用で仕入コスト低減\n'
    response += '- セットメニュー化で高原価品を低原価品と組み合わせ\n'

    return response
  }

  // 月次分析
  if (lower.includes('今月') || lower.includes('月次') || lower.includes('分析') || lower.includes('売上')) {
    if (analyses.length === 0) return '月次分析データがまだ登録されていません。原価分析ページでデータを入力してください。'

    const latest = analyses[0]
    let response = `**${latest.year_month} の原価分析:**\n\n`
    response += `- 月間売上: ¥${latest.monthly_sales.toLocaleString()}\n`
    response += `- 仕入額: ¥${latest.purchase_amount.toLocaleString()}\n`
    response += `- 原価率: **${latest.cost_rate}%**\n\n`

    if (analyses.length >= 2) {
      const prev = analyses[1]
      const diff = latest.cost_rate - prev.cost_rate
      response += `**前月比（${prev.year_month}）:**\n`
      response += `- 売上: ¥${prev.monthly_sales.toLocaleString()} → ¥${latest.monthly_sales.toLocaleString()}（${latest.monthly_sales > prev.monthly_sales ? '↑' : '↓'}${Math.abs(latest.monthly_sales - prev.monthly_sales).toLocaleString()}円）\n`
      response += `- 原価率: ${prev.cost_rate}% → ${latest.cost_rate}%（${diff > 0 ? '↑' : '↓'}${Math.abs(diff).toFixed(1)}pt）\n`
      if (diff > 0) {
        response += '\n⚠️ 原価率が上昇しています。仕入コストの見直しを検討してください。'
      } else {
        response += '\n✅ 原価率は改善傾向です。引き続き管理を継続しましょう。'
      }
    }

    if (analyses.length >= 3) {
      response += '\n\n**直近推移:**\n'
      analyses.slice(0, 6).reverse().forEach((a) => {
        const bar = '█'.repeat(Math.round(a.cost_rate / 5))
        response += `${a.year_month}: ${bar} ${a.cost_rate}%\n`
      })
    }

    return response
  }

  // 食材について
  if (lower.includes('食材') || lower.includes('仕入')) {
    if (ingredients.length === 0) return '食材データがまだ登録されていません。'

    const sorted = [...ingredients].sort((a, b) => b.purchase_price - a.purchase_price)
    let response = '**食材コストランキング（仕入単価順）:**\n\n'
    sorted.slice(0, 10).forEach((i, idx) => {
      response += `${idx + 1}. ${i.name}: ¥${i.purchase_price.toLocaleString()}/${i.unit}\n`
    })
    return response
  }

  // デフォルト: 全体サマリー
  let response = ''
  if (recipes.length > 0) {
    const avgRate = recipes.reduce((sum, r) => sum + r.cost_rate, 0) / recipes.length
    response += `**店舗の概要:**\n`
    response += `- 登録メニュー: ${recipes.length}品\n`
    response += `- 平均原価率: ${avgRate.toFixed(1)}%\n`
    response += `- 登録食材: ${ingredients.length}品\n\n`
  }

  if (analyses.length > 0) {
    response += `- 直近月売上: ¥${analyses[0].monthly_sales.toLocaleString()}\n\n`
  }

  response += `以下のような質問にお答えできます：\n`
  response += `- 「原価率の高いメニューは？」\n`
  response += `- 「ポテトサラダのじゃがいもが80円になったら原価率は？」\n`
  response += `- 「原価率を改善するには？」\n`
  response += `- 「今月の原価分析」\n`
  response += `- 「食材コストランキング」\n`

  return response
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

    // Get user's org_id
    let orgId: string | null = null
    try {
      const supabase = createServerSupabaseClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('org_id')
          .eq('id', user.id)
          .single()
        orgId = profile?.org_id ?? null
      }
    } catch {
      // continue without auth
    }

    // Fetch org data
    const orgData = orgId ? await fetchOrgData(orgId) : {
      recipes: [] as RecipeData[],
      analyses: [] as AnalysisData[],
      ingredients: [] as IngredientData[],
      recipeItems: [] as RecipeItemData[],
    }

    // If Anthropic API key is available, use Claude
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (apiKey) {
      let contextData = ''
      if (orgData.recipes.length > 0) {
        contextData += '\n【登録メニュー（原価率順）】\n'
        orgData.recipes.forEach((r) => {
          contextData += `- ${r.name}（${r.category}）: 売価¥${r.selling_price}, 原価¥${r.cost}, 原価率${r.cost_rate}%\n`
        })
      }
      if (orgData.analyses.length > 0) {
        contextData += '\n【月次原価分析（直近6ヶ月）】\n'
        orgData.analyses.forEach((a) => {
          contextData += `- ${a.year_month}: 売上¥${a.monthly_sales}, 仕入¥${a.purchase_amount}, 原価率${a.cost_rate}%\n`
        })
      }
      if (orgData.ingredients.length > 0) {
        contextData += '\n【主要食材（単価順）】\n'
        orgData.ingredients.forEach((i) => {
          contextData += `- ${i.name}: 仕入単価¥${i.purchase_price}/${i.unit}\n`
        })
      }
      if (orgData.recipeItems.length > 0) {
        contextData += '\n【レシピ材料詳細】\n'
        const byRecipe = new Map<string, typeof orgData.recipeItems>()
        orgData.recipeItems.forEach((ri) => {
          const arr = byRecipe.get(ri.recipe_name) || []
          arr.push(ri)
          byRecipe.set(ri.recipe_name, arr)
        })
        byRecipe.forEach((items, recipeName) => {
          contextData += `${recipeName}: `
          contextData += items.map((i) => `${i.name}${i.quantity}${i.unit}=¥${Math.round(i.cost)}`).join(', ')
          contextData += '\n'
        })
      }

      const systemPrompt = `あなたは飲食店の原価管理アシスタントです。ユーザーの質問に対して、具体的で実用的なアドバイスを日本語で提供してください。

以下はこの店舗の実際のデータです：
${contextData || '（データがまだ登録されていません。一般的なアドバイスを提供してください。）'}

回答のガイドライン：
- 具体的な数値やデータに基づいて回答してください
- 飲食業界の一般的な基準（原価率30%前後）と比較してアドバイスしてください
- 改善提案は実行可能な具体的なアクションを含めてください
- 丁寧ですが簡潔に回答してください
- シミュレーション質問（「〇〇が△円になったら？」）には計算結果を示してください`

      const apiMessages = [
        ...history.map((m) => ({ role: m.role, content: m.content })),
        { role: 'user' as const, content: message },
      ]

      try {
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

        if (response.ok) {
          const data = await response.json()
          const assistantMessage = data.content?.[0]?.text ?? 'レスポンスの取得に失敗しました。'
          return NextResponse.json({ response: assistantMessage })
        }
      } catch {
        // Fall through to smart response
      }
    }

    // Smart response using DB data (no API key needed)
    const smartResponse = buildSmartResponse(message, orgData)
    return NextResponse.json({ response: smartResponse })
  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}
