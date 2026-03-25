import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import AppLayout from '@/components/AppLayout'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createServerSupabaseClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*, organization:organizations(*)')
    .eq('id', user.id)
    .single()

  if (!profile) {
    redirect('/login')
  }

  const orgName = profile.organization?.name ?? 'マイ店舗'

  return (
    <AppLayout title="ダッシュボード" orgName={orgName}>
      {children}
    </AppLayout>
  )
}
