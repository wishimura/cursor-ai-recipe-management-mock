import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

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
    const supplierId = url.searchParams.get('supplier_id')
    const page = parseInt(url.searchParams.get('page') || '1', 10)
    const limit = Math.min(
      parseInt(url.searchParams.get('limit') || '50', 10),
      200
    )
    const offset = (page - 1) * limit

    let query = supabase
      .from('ingredients')
      .select('*, supplier:suppliers(*)', { count: 'exact' })
      .eq('org_id', orgId!)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (search) {
      query = query.ilike('name', `%${search}%`)
    }

    if (supplierId) {
      query = query.eq('supplier_id', supplierId)
    }

    const { data, error: queryError, count } = await query

    if (queryError) {
      console.error('Ingredients fetch error:', queryError)
      return NextResponse.json(
        { error: '食材の取得に失敗しました' },
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
    console.error('Ingredients GET error:', error)
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
      specification,
      unit,
      purchase_price,
      unit_cost,
      cost_unit,
      supplier_id,
    } = body

    // Validation
    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json(
        { error: '食材名は必須です' },
        { status: 400 }
      )
    }

    if (!unit || typeof unit !== 'string') {
      return NextResponse.json(
        { error: '単位は必須です' },
        { status: 400 }
      )
    }

    if (typeof purchase_price !== 'number' || purchase_price < 0) {
      return NextResponse.json(
        { error: '仕入単価は0以上の数値で指定してください' },
        { status: 400 }
      )
    }

    if (typeof unit_cost !== 'number' || unit_cost < 0) {
      return NextResponse.json(
        { error: '使用単価は0以上の数値で指定してください' },
        { status: 400 }
      )
    }

    // Verify supplier belongs to the same org if provided
    if (supplier_id) {
      const { data: supplier } = await supabase
        .from('suppliers')
        .select('id')
        .eq('id', supplier_id)
        .eq('org_id', orgId!)
        .single()

      if (!supplier) {
        return NextResponse.json(
          { error: '指定された業者が見つかりません' },
          { status: 400 }
        )
      }
    }

    const { data, error: insertError } = await supabase
      .from('ingredients')
      .insert({
        org_id: orgId!,
        name: name.trim(),
        specification: specification?.trim() || null,
        unit,
        purchase_price,
        unit_cost,
        cost_unit: cost_unit || unit,
        supplier_id: supplier_id || null,
      })
      .select('*, supplier:suppliers(*)')
      .single()

    if (insertError) {
      console.error('Ingredient insert error:', insertError)
      return NextResponse.json(
        { error: '食材の登録に失敗しました' },
        { status: 500 }
      )
    }

    return NextResponse.json({ data }, { status: 201 })
  } catch (error) {
    console.error('Ingredients POST error:', error)
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}
