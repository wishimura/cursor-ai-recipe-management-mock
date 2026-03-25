'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import AppLayout from '@/components/AppLayout'
import { Plus, X } from 'lucide-react'
import type { Profile } from '@/types/database'

function useCurrentUser() {
  const [orgId, setOrgId] = useState<string | null>(null)
  const [role, setRole] = useState<'owner' | 'admin' | 'member' | null>(null)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      setUserId(user.id)
      supabase
        .from('profiles')
        .select('org_id, role')
        .eq('id', user.id)
        .single()
        .then(({ data }) => {
          if (data) {
            setOrgId(data.org_id)
            setRole(data.role)
          }
        })
    })
  }, [])
  return { orgId, role, userId }
}

const roleBadge = (role: string) => {
  switch (role) {
    case 'owner':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
          オーナー
        </span>
      )
    case 'admin':
      return <span className="badge-info">管理者</span>
    case 'member':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
          メンバー
        </span>
      )
    default:
      return null
  }
}

const statusBadge = (isActive: boolean) => {
  return isActive ? (
    <span className="badge-success">有効</span>
  ) : (
    <span className="badge-danger">無効</span>
  )
}

export default function AccountsPage() {
  const { orgId, role: currentRole, userId } = useCurrentUser()
  const supabase = useMemo(() => createClient(), [])

  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Invite modal
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'admin' | 'member'>('member')
  const [inviting, setInviting] = useState(false)

  const canManage = currentRole === 'owner' || currentRole === 'admin'

  const loadProfiles = async () => {
    if (!orgId) return
    setLoading(true)
    setError(null)
    try {
      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('org_id', orgId)
        .order('created_at')

      if (fetchError) throw fetchError
      setProfiles(data ?? [])
    } catch {
      setError('アカウントデータの読み込みに失敗しました')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProfiles()
  }, [orgId])

  const handleToggleActive = async (profile: Profile) => {
    if (!canManage) return
    // Cannot deactivate yourself or owner
    if (profile.id === userId) return
    if (profile.role === 'owner') return

    setError(null)
    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ is_active: !profile.is_active })
        .eq('id', profile.id)

      if (updateError) throw updateError
      await loadProfiles()
    } catch {
      setError('ステータスの変更に失敗しました')
    }
  }

  const handleInvite = async () => {
    if (!orgId || !inviteEmail.trim()) return
    setInviting(true)
    setError(null)
    try {
      // Invite via Supabase Auth admin or custom invite endpoint
      const { error: inviteError } = await supabase.auth.admin.inviteUserByEmail(
        inviteEmail.trim(),
        { data: { org_id: orgId, role: inviteRole } }
      )

      // Fallback: if admin API not available, insert profile directly
      if (inviteError) {
        const { error: insertError } = await supabase.from('profiles').insert({
          org_id: orgId,
          email: inviteEmail.trim(),
          full_name: '',
          role: inviteRole,
          is_active: true,
        })
        if (insertError) throw insertError
      }

      setInviteOpen(false)
      setInviteEmail('')
      setInviteRole('member')
      await loadProfiles()
    } catch {
      setError('招待に失敗しました')
    } finally {
      setInviting(false)
    }
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-'
    const d = new Date(dateStr)
    return d.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (!orgId) {
    return (
      <AppLayout title="アカウント管理">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">読み込み中...</div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout title="アカウント管理">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">
            組織のメンバーを管理します。
            {!canManage && '（閲覧のみ）'}
          </p>
          {canManage && (
            <button
              className="btn-primary flex items-center gap-2"
              onClick={() => setInviteOpen(true)}
            >
              <Plus size={18} />
              メンバーを招待
            </button>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Members table */}
        <div className="card p-0 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <div className="text-gray-500">読み込み中...</div>
            </div>
          ) : profiles.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-gray-500 text-sm">
              メンバーが登録されていません
            </div>
          ) : (
            {/* Mobile card view */}
            <div className="sm:hidden space-y-3 p-4">
              {profiles.map((profile) => (
                <div key={profile.id} className="bg-white rounded-lg border border-gray-200 p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-bold text-gray-900">
                        {profile.full_name || '(未設定)'}
                        {profile.id === userId && (
                          <span className="ml-2 text-xs text-gray-400">（自分）</span>
                        )}
                      </p>
                    </div>
                    <div>{roleBadge(profile.role)}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm mt-3">
                    <span className="text-gray-500">メール</span>
                    <span className="text-gray-900 truncate">{profile.email}</span>
                    <span className="text-gray-500">ステータス</span>
                    <span>{statusBadge(profile.is_active)}</span>
                    <span className="text-gray-500">最終ログイン</span>
                    <span className="text-gray-900">{formatDate(profile.last_login_at)}</span>
                  </div>
                  {canManage && profile.id !== userId && profile.role !== 'owner' && (
                    <div className="flex justify-end gap-2 pt-3 border-t border-gray-100 mt-3">
                      <button
                        className={`text-xs font-medium px-3 py-1 rounded-md transition-colors ${
                          profile.is_active
                            ? 'text-red-600 hover:bg-red-50'
                            : 'text-green-600 hover:bg-green-50'
                        }`}
                        onClick={() => handleToggleActive(profile)}
                      >
                        {profile.is_active ? '無効にする' : '有効にする'}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
            {/* Desktop table view */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="table-header">名前</th>
                    <th className="table-header">メールアドレス</th>
                    <th className="table-header">権限</th>
                    <th className="table-header">ステータス</th>
                    <th className="table-header">最終ログイン</th>
                    {canManage && <th className="table-header">操作</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {profiles.map((profile) => (
                    <tr key={profile.id} className="hover:bg-gray-50">
                      <td className="table-cell font-medium">
                        {profile.full_name || '(未設定)'}
                        {profile.id === userId && (
                          <span className="ml-2 text-xs text-gray-400">（自分）</span>
                        )}
                      </td>
                      <td className="table-cell">{profile.email}</td>
                      <td className="table-cell">{roleBadge(profile.role)}</td>
                      <td className="table-cell">{statusBadge(profile.is_active)}</td>
                      <td className="table-cell text-gray-500">
                        {formatDate(profile.last_login_at)}
                      </td>
                      {canManage && (
                        <td className="table-cell">
                          {profile.id !== userId && profile.role !== 'owner' && (
                            <button
                              className={`text-xs font-medium px-3 py-1 rounded-md transition-colors ${
                                profile.is_active
                                  ? 'text-red-600 hover:bg-red-50'
                                  : 'text-green-600 hover:bg-green-50'
                              }`}
                              onClick={() => handleToggleActive(profile)}
                            >
                              {profile.is_active ? '無効にする' : '有効にする'}
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Invite Modal */}
      {inviteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => setInviteOpen(false)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">メンバーを招待</h2>
              <button
                className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                onClick={() => setInviteOpen(false)}
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="label">
                  メールアドレス <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  className="input-field"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="user@example.com"
                />
              </div>
              <div>
                <label className="label">権限</label>
                <select
                  className="input-field"
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as 'admin' | 'member')}
                >
                  <option value="member">メンバー</option>
                  <option value="admin">管理者</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button className="btn-secondary" onClick={() => setInviteOpen(false)}>
                キャンセル
              </button>
              <button
                className="btn-primary"
                onClick={handleInvite}
                disabled={inviting || !inviteEmail.trim()}
              >
                {inviting ? '招待中...' : '招待する'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
