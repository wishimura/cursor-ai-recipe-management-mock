'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import AppLayout from '@/components/AppLayout'
import { Copy, Check } from 'lucide-react'
import type { Organization } from '@/types/database'

const planLabels: Record<Organization['plan'], string> = {
  free: 'Free',
  starter: 'Starter',
  pro: 'Pro',
  enterprise: 'Enterprise',
}

const planBadgeClass: Record<Organization['plan'], string> = {
  free: 'bg-blue-100 text-blue-800',
  starter: 'bg-green-100 text-green-800',
  pro: 'bg-purple-100 text-purple-800',
  enterprise: 'bg-orange-100 text-orange-800',
}

export default function SettingsPage() {
  const supabase = useMemo(() => createClient(), [])

  const [org, setOrg] = useState<Organization | null>(null)
  const [role, setRole] = useState<'owner' | 'admin' | 'member' | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState('')
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [copied, setCopied] = useState(false)

  const isOwner = role === 'owner'

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data: profile } = await supabase
          .from('profiles')
          .select('org_id, role')
          .eq('id', user.id)
          .single()

        if (!profile) return
        setRole(profile.role)

        const { data: organization, error } = await supabase
          .from('organizations')
          .select('*')
          .eq('id', profile.org_id)
          .single()

        if (error) throw error
        if (organization) {
          setOrg(organization)
          setName(organization.name)
        }
      } catch {
        setMessage({ type: 'error', text: '組織データの読み込みに失敗しました' })
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [supabase])

  const handleSave = async () => {
    if (!org || !isOwner || !name.trim()) return
    setSaving(true)
    setMessage(null)
    try {
      const { error } = await supabase
        .from('organizations')
        .update({ name: name.trim() })
        .eq('id', org.id)

      if (error) throw error
      setOrg({ ...org, name: name.trim() })
      setMessage({ type: 'success', text: '組織設定を保存しました' })
    } catch {
      setMessage({ type: 'error', text: '組織設定の保存に失敗しました' })
    } finally {
      setSaving(false)
    }
  }

  const handleCopySlug = async () => {
    if (!org) return
    try {
      await navigator.clipboard.writeText(org.slug)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback
    }
  }

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}年${m}月${day}日`
  }

  if (loading) {
    return (
      <AppLayout title="組織設定">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">読み込み中...</div>
        </div>
      </AppLayout>
    )
  }

  if (!org) {
    return (
      <AppLayout title="組織設定">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">組織データが見つかりません</div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout title="組織設定">
      <div className="space-y-6 max-w-2xl">
        {!isOwner && (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg text-sm">
            組織設定の変更にはオーナー権限が必要です
          </div>
        )}

        {message && (
          <div
            className={`px-4 py-3 rounded-lg text-sm ${
              message.type === 'success'
                ? 'bg-green-50 border border-green-200 text-green-700'
                : 'bg-red-50 border border-red-200 text-red-700'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* 組織情報 */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">組織情報</h2>
          <div className="space-y-4">
            <div>
              <label className="label">組織名</label>
              {isOwner ? (
                <input
                  type="text"
                  className="input-field"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              ) : (
                <p className="text-sm text-gray-900 py-2">{org.name}</p>
              )}
            </div>

            <div>
              <label className="label">プラン</label>
              <div className="py-2">
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${planBadgeClass[org.plan]}`}
                >
                  {planLabels[org.plan]}
                </span>
              </div>
            </div>

            <div>
              <label className="label">作成日</label>
              <p className="text-sm text-gray-900 py-2">{formatDate(org.created_at)}</p>
            </div>
          </div>
        </div>

        {/* 組織ID */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">組織ID</h2>
          <div className="space-y-4">
            <div>
              <label className="label">スラッグ</label>
              <div className="flex items-center gap-2">
                <p className="text-sm text-gray-900 py-2 font-mono">{org.slug}</p>
                <button
                  type="button"
                  onClick={handleCopySlug}
                  className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                  title="コピー"
                >
                  {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                </button>
              </div>
            </div>

            <div>
              <label className="label">組織UUID</label>
              <p className="text-xs text-gray-400 py-2 font-mono">{org.id}</p>
            </div>
          </div>
        </div>

        {/* Save button */}
        {isOwner && (
          <div className="flex justify-end">
            <button
              className="btn-primary"
              onClick={handleSave}
              disabled={saving || !name.trim()}
            >
              {saving ? '保存中...' : '保存する'}
            </button>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
