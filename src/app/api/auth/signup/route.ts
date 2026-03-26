import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[\s\u3000]+/g, '-')
    .replace(/[^\w\u3040-\u30FF\u4E00-\u9FFF-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 60)
    || `org-${Date.now()}`
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, full_name, org_name } = body

    if (!email || !password || !full_name || !org_name) {
      return NextResponse.json(
        { error: '必須項目が不足しています' },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'パスワードは6文字以上で入力してください' },
        { status: 400 }
      )
    }

    let supabase
    try {
      supabase = createServiceRoleClient()
    } catch (e) {
      console.error('Supabase client creation failed:', e)
      return NextResponse.json(
        { error: 'データベース接続に失敗しました。管理者にお問い合わせください。' },
        { status: 500 }
      )
    }

    // Create user via Admin API (bypasses email confirmation)
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name,
        org_name,
      },
    })

    if (authError) {
      console.error('Auth user creation failed:', authError)
      const msg = authError.message || ''
      if (msg.includes('already been registered') || msg.includes('already exists')) {
        return NextResponse.json(
          { error: 'このメールアドレスは既に登録されています' },
          { status: 409 }
        )
      }
      return NextResponse.json(
        { error: '登録に失敗しました。しばらく経ってからお試しください。' },
        { status: 500 }
      )
    }

    const userId = authData.user.id

    // Wait briefly for trigger to fire
    await new Promise((resolve) => setTimeout(resolve, 500))

    // Check if the DB trigger already created the profile
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id, org_id')
      .eq('id', userId)
      .single()

    if (existingProfile) {
      // Trigger handled it — update org name if needed
      if (org_name) {
        await supabase
          .from('organizations')
          .update({ name: org_name })
          .eq('id', existingProfile.org_id)
      }
      return NextResponse.json({ success: true, org_id: existingProfile.org_id })
    }

    // Trigger didn't fire — create manually
    const baseSlug = generateSlug(org_name)
    const slug = `${baseSlug}-${Date.now().toString(36)}`

    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .insert({ name: org_name, slug })
      .select('id')
      .single()

    if (orgError) {
      console.error('Organization creation failed:', orgError)
      return NextResponse.json(
        { error: '組織の作成に失敗しました。しばらく経ってからお試しください。' },
        { status: 500 }
      )
    }

    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: userId,
        org_id: org.id,
        email,
        full_name,
        role: 'owner',
      })

    if (profileError) {
      console.error('Profile creation failed:', profileError)
      await supabase.from('organizations').delete().eq('id', org.id)
      return NextResponse.json(
        { error: 'プロフィールの作成に失敗しました。しばらく経ってからお試しください。' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, org_id: org.id })
  } catch (err) {
    console.error('Signup processing error:', err)
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}
