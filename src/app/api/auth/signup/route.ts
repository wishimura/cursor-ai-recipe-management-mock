import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[\s\u3000]+/g, '-')        // spaces (including full-width) to hyphens
    .replace(/[^\w\u3040-\u30FF\u4E00-\u9FFF-]/g, '') // keep alphanumeric, Japanese chars, hyphens
    .replace(/-+/g, '-')                  // collapse consecutive hyphens
    .replace(/^-|-$/g, '')                // trim leading/trailing hyphens
    .substring(0, 60)
    || `org-${Date.now()}`                // fallback
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { user_id, email, full_name, org_name } = body

    if (!user_id || !full_name || !org_name) {
      return NextResponse.json(
        { error: '必須項目が不足しています' },
        { status: 400 }
      )
    }

    const supabase = createServiceRoleClient()

    // Check if the DB trigger already created the profile
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id, org_id')
      .eq('id', user_id)
      .single()

    if (existingProfile) {
      // Trigger already handled it — update org name if needed
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
      .insert({
        name: org_name,
        slug,
      })
      .select('id')
      .single()

    if (orgError) {
      console.error('Organization creation failed:', orgError)
      return NextResponse.json(
        { error: '組織の作成に失敗しました' },
        { status: 500 }
      )
    }

    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: user_id,
        org_id: org.id,
        email: email || '',
        full_name,
        role: 'owner',
      })

    if (profileError) {
      console.error('Profile creation failed:', profileError)
      await supabase.from('organizations').delete().eq('id', org.id)
      return NextResponse.json(
        { error: 'プロフィールの作成に失敗しました' },
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
