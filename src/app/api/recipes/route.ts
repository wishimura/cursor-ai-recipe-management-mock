import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

type RecipeItemInput = {
  item_type: 'ingredient' | 'prep_recipe'
  ingredient_id?: string | null
  prep_recipe_id?: string | null
  name: string
  quantity: number
  unit: string
  unit_cost: number
  cost: number
}

async function getAuthenticatedOrgId(): Promise<{
  orgId: string | null
  error: NextResponse | null
  supabase: ReturnType<typeof createServerSupabaseClient>
}> {
  const supabase = createServerSupabaseClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return {
      orgId: null,
      error: NextResponse.json({ error: '認証が必要です' }, { status: 401 }),
      supabase,
    }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id')
    .eq('id', user.id)
    .single()

  if (!profile?.org_id) {
    return {
      orgId: null,
      error: NextResponse.json(
        { error: '組織が見つかりません' },
        { status: 404 }
      ),
      supabase,
    }
  }

  return { orgId: profile.org_id, error: null, supabase }
}

export async function GET(request: NextRequest) {
  try {
    const { orgId, error, supabase } = await getAuthenticatedOrgId()
    if (error) return error

    const url = new URL(request.url)
    const search = url.searchParams.get('search')
    const category = url.searchParams.get('category')
    const page = parseInt(url.searchParams.get('page') || '1', 10)
    const limit = Math.min(
      parseInt(url.searchParams.get('limit') || '50', 10),
      200
    )
    const offset = (page - 1) * limit

    let query = supabase
      .from('recipes')
      .select('*, items:recipe_items(*)', { count: 'exact' })
      .eq('org_id', orgId!)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (search) {
      query = query.ilike('name', `%${search}%`)
    }

    if (category) {
      query = query.eq('category', category)
    }

    const { data, error: queryError, count } = await query

    if (queryError) {
      console.error('Recipes fetch error:', queryError)
      return NextResponse.json(
        { error: 'レシピの取得に失敗しました' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      data,
      pagination: {
        page,
        limit,
        total: count ?? 0,
        totalPages: count ? Math.ceil(count / limit) : 0,
      },
    })
  } catch (error) {
    console.error('Recipes GET error:', error)
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { orgId, error, supabase } = await getAuthenticatedOrgId()
    if (error) return error

    const body = await request.json()
    const {
      name,
      category,
      selling_price,
      notes,
      image_url,
      items,
    } = body as {
      name: string
      category: string
      selling_price: number
      notes?: string
      image_url?: string
      items: RecipeItemInput[]
    }

    // Validation
    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json(
        { error: 'レシピ名は必須です' },
        { status: 400 }
      )
    }

    if (!category || typeof category !== 'string') {
      return NextResponse.json(
        { error: 'カテゴリは必須です' },
        { status: 400 }
      )
    }

    if (typeof selling_price !== 'number' || selling_price < 0) {
      return NextResponse.json(
        { error: '売価は0以上の数値で指定してください' },
        { status: 400 }
      )
    }

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'レシピには少なくとも1つの材料が必要です' },
        { status: 400 }
      )
    }

    // Validate each item
    for (const item of items) {
      if (!item.name || !item.unit || typeof item.quantity !== 'number') {
        return NextResponse.json(
          { error: '材料の名前、単位、数量は必須です' },
          { status: 400 }
        )
      }
      if (
        !['ingredient', 'prep_recipe'].includes(item.item_type)
      ) {
        return NextResponse.json(
          { error: '材料種別が無効です' },
          { status: 400 }
        )
      }
    }

    // Calculate costs
    const totalCost = items.reduce((sum, item) => sum + (item.cost || 0), 0)
    const costRate =
      selling_price > 0
        ? Math.round((totalCost / selling_price) * 1000) / 10
        : 0
    const grossProfit = selling_price - totalCost

    // Insert recipe
    const { data: recipe, error: recipeError } = await supabase
      .from('recipes')
      .insert({
        org_id: orgId!,
        name: name.trim(),
        category,
        selling_price,
        cost: totalCost,
        cost_rate: costRate,
        gross_profit: grossProfit,
        notes: notes?.trim() || null,
        image_url: image_url || null,
      })
      .select()
      .single()

    if (recipeError) {
      console.error('Recipe insert error:', recipeError)
      return NextResponse.json(
        { error: 'レシピの登録に失敗しました' },
        { status: 500 }
      )
    }

    // Insert recipe items
    const recipeItems = items.map((item) => ({
      recipe_id: recipe.id,
      item_type: item.item_type,
      ingredient_id: item.ingredient_id || null,
      prep_recipe_id: item.prep_recipe_id || null,
      name: item.name,
      quantity: item.quantity,
      unit: item.unit,
      unit_cost: item.unit_cost || 0,
      cost: item.cost || 0,
    }))

    const { error: itemsError } = await supabase
      .from('recipe_items')
      .insert(recipeItems)

    if (itemsError) {
      console.error('Recipe items insert error:', itemsError)
      // Attempt to clean up the recipe if items failed
      await supabase.from('recipes').delete().eq('id', recipe.id)
      return NextResponse.json(
        { error: 'レシピ材料の登録に失敗しました' },
        { status: 500 }
      )
    }

    // Fetch the complete recipe with items
    const { data: fullRecipe } = await supabase
      .from('recipes')
      .select('*, items:recipe_items(*)')
      .eq('id', recipe.id)
      .single()

    return NextResponse.json({ data: fullRecipe }, { status: 201 })
  } catch (error) {
    console.error('Recipes POST error:', error)
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}
