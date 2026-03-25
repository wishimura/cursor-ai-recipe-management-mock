'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import AppLayout from '@/components/AppLayout'

export default function ProfilePage() {
  const supabase = useMemo(() => createClient(), [])

  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(true)
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)

  const [profileMessage, setProfileMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  useEffect(() => {
    const loadProfile = async () => {
      setLoading(true)
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        setEmail(user.email ?? '')

        const { data, error } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .single()

        if (error) throw error
        setFullName(data?.full_name ?? '')
      } catch {
        setProfileMessage({ type: 'error', text: 'プロフィールの読み込みに失敗しました' })
      } finally {
        setLoading(false)
      }
    }

    loadProfile()
  }, [supabase])

  const handleSaveProfile = async () => {
    setSavingProfile(true)
    setProfileMessage(null)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('未認証')

      const { error } = await supabase
        .from('profiles')
        .update({ full_name: fullName })
        .eq('id', user.id)

      if (error) throw error
      setProfileMessage({ type: 'success', text: 'プロフィールを更新しました' })
    } catch {
      setProfileMessage({ type: 'error', text: 'プロフィールの更新に失敗しました' })
    } finally {
      setSavingProfile(false)
    }
  }

  const handleSavePassword = async () => {
    setPasswordMessage(null)

    if (newPassword.length < 6) {
      setPasswordMessage({ type: 'error', text: 'パスワードは6文字以上で入力してください' })
      return
    }

    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'パスワードが一致しません' })
      return
    }

    setSavingPassword(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error

      setNewPassword('')
      setConfirmPassword('')
      setPasswordMessage({ type: 'success', text: 'パスワードを変更しました' })
    } catch {
      setPasswordMessage({ type: 'error', text: 'パスワードの変更に失敗しました' })
    } finally {
      setSavingPassword(false)
    }
  }

  if (loading) {
    return (
      <AppLayout title="プロフィール設定">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">読み込み中...</div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout title="プロフィール設定">
      <div className="space-y-6">
        {/* Section 1: プロフィール情報 */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">プロフィール情報</h2>

          {profileMessage && (
            <div
              className={`mb-4 px-4 py-3 rounded-lg text-sm ${
                profileMessage.type === 'success'
                  ? 'bg-green-50 border border-green-200 text-green-700'
                  : 'bg-red-50 border border-red-200 text-red-700'
              }`}
            >
              {profileMessage.text}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="label">メールアドレス</label>
              <input
                type="email"
                className="input-field bg-gray-100 text-gray-500 cursor-not-allowed"
                value={email}
                readOnly
              />
            </div>

            <div>
              <label className="label">氏名</label>
              <input
                type="text"
                className="input-field"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="氏名を入力"
              />
            </div>
          </div>

          <div className="mt-6">
            <button
              className="btn-primary"
              onClick={handleSaveProfile}
              disabled={savingProfile}
            >
              {savingProfile ? '保存中...' : '保存する'}
            </button>
          </div>
        </div>

        {/* Section 2: パスワード変更 */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">パスワード変更</h2>

          {passwordMessage && (
            <div
              className={`mb-4 px-4 py-3 rounded-lg text-sm ${
                passwordMessage.type === 'success'
                  ? 'bg-green-50 border border-green-200 text-green-700'
                  : 'bg-red-50 border border-red-200 text-red-700'
              }`}
            >
              {passwordMessage.text}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="label">新しいパスワード</label>
              <input
                type="password"
                className="input-field"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="6文字以上"
              />
            </div>

            <div>
              <label className="label">パスワード確認</label>
              <input
                type="password"
                className="input-field"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="パスワードを再入力"
              />
            </div>
          </div>

          <div className="mt-6">
            <button
              className="btn-primary"
              onClick={handleSavePassword}
              disabled={savingPassword || !newPassword || !confirmPassword}
            >
              {savingPassword ? '変更中...' : 'パスワードを変更する'}
            </button>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
