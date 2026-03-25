'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import AppLayout from '@/components/AppLayout'
import { Plus, Search, Pencil, Trash2, X, Phone, User, Mail } from 'lucide-react'
import type { Supplier } from '@/types/database'

function useOrgId() {
  const [orgId, setOrgId] = useState<string | null>(null)
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase
        .from('profiles')
        .select('org_id')
        .eq('id', user.id)
        .single()
        .then(({ data }) => {
          if (data) setOrgId(data.org_id)
        })
    })
  }, [])
  return orgId
}

type SupplierWithCount = Supplier & { ingredient_count: number }

type SupplierForm = {
  name: string
  contact_phone: string
  contact_person: string
  email: string
  notes: string
}

const emptyForm: SupplierForm = {
  name: '',
  contact_phone: '',
  contact_person: '',
  email: '',
  notes: '',
}

export default function SuppliersPage() {
  const orgId = useOrgId()
  const supabase = useMemo(() => createClient(), [])

  const [suppliers, setSuppliers] = useState<SupplierWithCount[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  // Modal state
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<SupplierForm>(emptyForm)
  const [formSaving, setFormSaving] = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  const loadSuppliers = async () => {
    if (!orgId) return
    setLoading(true)
    setError(null)
    try {
      const { data: supplierData, error: fetchError } = await supabase
        .from('suppliers')
        .select('*, ingredients(count)')
        .eq('org_id', orgId)
        .order('name')

      if (fetchError) throw fetchError

      const withCount: SupplierWithCount[] = (supplierData ?? []).map((s: any) => ({
        ...s,
        ingredient_count: s.ingredients?.[0]?.count ?? 0,
      }))
      setSuppliers(withCount)
    } catch {
      setError('業者データの読み込みに失敗しました')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSuppliers()
  }, [orgId])

  const filteredSuppliers = suppliers.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.contact_person?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.contact_phone?.includes(searchQuery)
  )

  const openAddModal = () => {
    setForm(emptyForm)
    setEditingId(null)
    setModalOpen(true)
  }

  const openEditModal = (supplier: SupplierWithCount) => {
    setForm({
      name: supplier.name,
      contact_phone: supplier.contact_phone ?? '',
      contact_person: supplier.contact_person ?? '',
      email: supplier.email ?? '',
      notes: supplier.notes ?? '',
    })
    setEditingId(supplier.id)
    setModalOpen(true)
  }

  const handleSave = async () => {
    if (!orgId || !form.name.trim()) return
    setFormSaving(true)
    setError(null)
    try {
      const record = {
        org_id: orgId,
        name: form.name.trim(),
        contact_phone: form.contact_phone.trim() || null,
        contact_person: form.contact_person.trim() || null,
        email: form.email.trim() || null,
        notes: form.notes.trim() || null,
      }

      if (editingId) {
        const { error: updateError } = await supabase
          .from('suppliers')
          .update(record)
          .eq('id', editingId)
        if (updateError) throw updateError
      } else {
        const { error: insertError } = await supabase.from('suppliers').insert(record)
        if (insertError) throw insertError
      }

      setModalOpen(false)
      await loadSuppliers()
    } catch {
      setError('保存に失敗しました')
    } finally {
      setFormSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!orgId) return
    setError(null)
    try {
      const { error: deleteError } = await supabase.from('suppliers').delete().eq('id', id)
      if (deleteError) throw deleteError
      setDeleteConfirmId(null)
      await loadSuppliers()
    } catch {
      setError('削除に失敗しました')
    }
  }

  if (!orgId) {
    return (
      <AppLayout title="業者管理">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">読み込み中...</div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout title="業者管理">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              className="input-field pl-10"
              placeholder="業者名、担当者、電話番号で検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button className="btn-primary flex items-center gap-2" onClick={openAddModal}>
            <Plus size={18} />
            業者を追加
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Supplier cards */}
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="text-gray-500">読み込み中...</div>
          </div>
        ) : filteredSuppliers.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-gray-500 text-sm">
              {searchQuery ? '検索条件に一致する業者がありません' : '業者が登録されていません'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSuppliers.map((supplier) => (
              <div key={supplier.id} className="card hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-base font-semibold text-gray-900 truncate">
                    {supplier.name}
                  </h3>
                  <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                    <button
                      className="p-1.5 rounded-md text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                      onClick={() => openEditModal(supplier)}
                      title="編集"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      onClick={() => setDeleteConfirmId(supplier.id)}
                      title="削除"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Package size={14} className="text-gray-400 flex-shrink-0" />
                    <span>登録食材: {supplier.ingredient_count}件</span>
                  </div>
                  {supplier.contact_phone && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <Phone size={14} className="text-gray-400 flex-shrink-0" />
                      <span>{supplier.contact_phone}</span>
                    </div>
                  )}
                  {supplier.contact_person && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <User size={14} className="text-gray-400 flex-shrink-0" />
                      <span>{supplier.contact_person}</span>
                    </div>
                  )}
                  {supplier.email && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <Mail size={14} className="text-gray-400 flex-shrink-0" />
                      <span className="truncate">{supplier.email}</span>
                    </div>
                  )}
                </div>

                {/* Delete confirmation */}
                {deleteConfirmId === supplier.id && (
                  <div className="mt-4 pt-3 border-t border-gray-200">
                    <p className="text-sm text-red-600 mb-2">この業者を削除しますか？</p>
                    <div className="flex gap-2">
                      <button
                        className="btn-danger text-xs px-3 py-1.5"
                        onClick={() => handleDelete(supplier.id)}
                      >
                        削除する
                      </button>
                      <button
                        className="btn-secondary text-xs px-3 py-1.5"
                        onClick={() => setDeleteConfirmId(null)}
                      >
                        キャンセル
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => setModalOpen(false)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingId ? '業者を編集' : '業者を追加'}
              </h2>
              <button
                className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                onClick={() => setModalOpen(false)}
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="label">
                  業者名 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className="input-field"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="例: 〇〇食品"
                />
              </div>
              <div>
                <label className="label">電話番号</label>
                <input
                  type="tel"
                  className="input-field"
                  value={form.contact_phone}
                  onChange={(e) => setForm({ ...form, contact_phone: e.target.value })}
                  placeholder="例: 03-1234-5678"
                />
              </div>
              <div>
                <label className="label">担当者名</label>
                <input
                  type="text"
                  className="input-field"
                  value={form.contact_person}
                  onChange={(e) => setForm({ ...form, contact_person: e.target.value })}
                  placeholder="例: 山田太郎"
                />
              </div>
              <div>
                <label className="label">メールアドレス</label>
                <input
                  type="email"
                  className="input-field"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="例: info@example.com"
                />
              </div>
              <div>
                <label className="label">備考</label>
                <textarea
                  className="input-field"
                  rows={3}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="配達曜日、支払条件など"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button className="btn-secondary" onClick={() => setModalOpen(false)}>
                キャンセル
              </button>
              <button
                className="btn-primary"
                onClick={handleSave}
                disabled={formSaving || !form.name.trim()}
              >
                {formSaving ? '保存中...' : editingId ? '更新' : '追加'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}

// Re-export Package icon used in cards (imported from lucide-react)
function Package(props: { size: number; className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={props.size}
      height={props.size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={props.className}
    >
      <path d="m7.5 4.27 9 5.15" />
      <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
      <path d="m3.3 7 8.7 5 8.7-5" />
      <path d="M12 22V12" />
    </svg>
  )
}
