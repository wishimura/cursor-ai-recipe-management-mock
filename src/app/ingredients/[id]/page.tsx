'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import AppLayout from '@/components/AppLayout'
import DeleteModal from '@/components/DeleteModal'

type Supplier = {
  id: string
  name: string
}

type FormData = {
  name: string
  supplier_id: string
  specification: string
  unit: string
  purchase_price: string
  unit_cost: string
  cost_unit: string
}

export default function EditIngredientPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const supabase = createClient()

  const [form, setForm] = useState<FormData>({
    name: '',
    supplier_id: '',
    specification: '',
    unit: 'g',
    purchase_price: '',
    unit_cost: '',
    cost_unit: 'g',
  })
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({})
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function fetchData() {
    try {
      setLoading(true)

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('org_id')
        .eq('id', user.id)
        .single()

      if (!profile?.org_id) return

      // Fetch suppliers and ingredient in parallel
      const [suppliersRes, ingredientRes] = await Promise.all([
        supabase
          .from('suppliers')
          .select('id, name')
          .eq('org_id', profile.org_id)
          .order('name'),
        supabase
          .from('ingredients')
          .select('*')
          .eq('id', id)
          .eq('org_id', profile.org_id)
          .single(),
      ])

      setSuppliers(suppliersRes.data ?? [])

      if (ingredientRes.error || !ingredientRes.data) {
        alert('食材が見つかりません')
        router.push('/ingredients')
        return
      }

      const ing = ingredientRes.data
      setForm({
        name: ing.name ?? '',
        supplier_id: ing.supplier_id ?? '',
        specification: ing.specification ?? '',
        unit: ing.unit ?? 'g',
        purchase_price: ing.purchase_price?.toString() ?? '',
        unit_cost: ing.unit_cost?.toString() ?? '',
        cost_unit: ing.cost_unit ?? 'g',
      })
    } catch (err) {
      console.error(err)
      alert('データの取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) {
    const { name, value } = e.target
    setForm((prev) => {
      const updated = { ...prev, [name]: value }

      if (name === 'purchase_price' || name === 'specification') {
        const price = parseFloat(
          name === 'purchase_price' ? value : prev.purchase_price
        )
        const spec = parseFloat(
          name === 'specification' ? value : prev.specification
        )
        if (!isNaN(price) && !isNaN(spec) && spec > 0) {
          updated.unit_cost = (price / spec).toFixed(2)
        }
      }

      return updated
    })

    if (errors[name as keyof FormData]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }))
    }
  }

  function validate(): boolean {
    const newErrors: Partial<Record<keyof FormData, string>> = {}

    if (!form.name.trim()) {
      newErrors.name = '食材名は必須です'
    }

    if (form.purchase_price && isNaN(Number(form.purchase_price))) {
      newErrors.purchase_price = '数値を入力してください'
    }

    if (form.unit_cost && isNaN(Number(form.unit_cost))) {
      newErrors.unit_cost = '数値を入力してください'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return

    try {
      setSaving(true)

      const payload = {
        name: form.name.trim(),
        supplier_id: form.supplier_id || null,
        specification: form.specification || null,
        unit: form.unit || null,
        purchase_price: form.purchase_price ? Number(form.purchase_price) : null,
        unit_cost: form.unit_cost ? Number(form.unit_cost) : null,
        cost_unit: form.cost_unit || null,
      }

      const { error } = await supabase
        .from('ingredients')
        .update(payload)
        .eq('id', id)

      if (error) throw error

      router.push('/ingredients')
    } catch (err) {
      console.error(err)
      alert('食材の更新に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    try {
      setDeleting(true)
      const { error } = await supabase
        .from('ingredients')
        .delete()
        .eq('id', id)

      if (error) throw error
      router.push('/ingredients')
    } catch (err) {
      console.error(err)
      alert('削除に失敗しました')
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <AppLayout title="食材編集">
        <div className="flex items-center justify-center py-24">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
          <span className="ml-3 text-sm text-gray-500">読み込み中...</span>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout
      title="食材編集"
      actions={
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowDeleteModal(true)}
            className="btn-danger inline-flex items-center gap-2"
          >
            <Trash2 size={16} />
            削除
          </button>
          <Link
            href="/ingredients"
            className="btn-secondary inline-flex items-center gap-2"
          >
            <ArrowLeft size={16} />
            戻る
          </Link>
        </div>
      }
    >
      <div className="max-w-2xl mx-auto">
        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name */}
            <div>
              <label htmlFor="name" className="label">
                食材名 <span className="text-red-500">*</span>
              </label>
              <input
                id="name"
                name="name"
                type="text"
                value={form.name}
                onChange={handleChange}
                placeholder="例: 鶏もも肉"
                className={`input-field ${errors.name ? 'border-red-500 focus:ring-red-500' : ''}`}
              />
              {errors.name && (
                <p className="mt-1 text-xs text-red-600">{errors.name}</p>
              )}
            </div>

            {/* Supplier */}
            <div>
              <label htmlFor="supplier_id" className="label">
                業者
              </label>
              <select
                id="supplier_id"
                name="supplier_id"
                value={form.supplier_id}
                onChange={handleChange}
                className="input-field"
              >
                <option value="">選択してください</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Specification and Unit */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="specification" className="label">
                  規格
                </label>
                <input
                  id="specification"
                  name="specification"
                  type="text"
                  value={form.specification}
                  onChange={handleChange}
                  placeholder="例: 1000"
                  className="input-field"
                />
                <p className="mt-1 text-xs text-gray-400">
                  数値を入力すると単位原価を自動計算します
                </p>
              </div>
              <div>
                <label htmlFor="unit" className="label">
                  単位
                </label>
                <select
                  id="unit"
                  name="unit"
                  value={form.unit}
                  onChange={handleChange}
                  className="input-field"
                >
                  <option value="g">g</option>
                  <option value="kg">kg</option>
                  <option value="ml">ml</option>
                  <option value="L">L</option>
                  <option value="個">個</option>
                  <option value="本">本</option>
                  <option value="枚">枚</option>
                  <option value="パック">パック</option>
                </select>
              </div>
            </div>

            {/* Purchase price */}
            <div>
              <label htmlFor="purchase_price" className="label">
                仕入単価（円）
              </label>
              <input
                id="purchase_price"
                name="purchase_price"
                type="number"
                step="0.01"
                min="0"
                value={form.purchase_price}
                onChange={handleChange}
                placeholder="例: 4800"
                className={`input-field ${errors.purchase_price ? 'border-red-500 focus:ring-red-500' : ''}`}
              />
              {errors.purchase_price && (
                <p className="mt-1 text-xs text-red-600">
                  {errors.purchase_price}
                </p>
              )}
            </div>

            {/* Unit cost and cost unit */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="unit_cost" className="label">
                  単位原価（円）
                </label>
                <input
                  id="unit_cost"
                  name="unit_cost"
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.unit_cost}
                  onChange={handleChange}
                  placeholder="自動計算"
                  className={`input-field ${errors.unit_cost ? 'border-red-500 focus:ring-red-500' : ''}`}
                />
                {errors.unit_cost && (
                  <p className="mt-1 text-xs text-red-600">
                    {errors.unit_cost}
                  </p>
                )}
              </div>
              <div>
                <label htmlFor="cost_unit" className="label">
                  原価単位
                </label>
                <select
                  id="cost_unit"
                  name="cost_unit"
                  value={form.cost_unit}
                  onChange={handleChange}
                  className="input-field"
                >
                  <option value="g">g</option>
                  <option value="kg">kg</option>
                  <option value="ml">ml</option>
                  <option value="L">L</option>
                  <option value="個">個</option>
                  <option value="本">本</option>
                  <option value="枚">枚</option>
                </select>
              </div>
            </div>

            {/* Preview */}
            {form.unit_cost && form.cost_unit && (
              <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
                <p className="text-sm text-primary-700">
                  単位原価：
                  <span className="font-semibold text-lg">
                    {Number(form.unit_cost).toLocaleString('ja-JP', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                    円/{form.cost_unit}
                  </span>
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <Link href="/ingredients" className="btn-secondary">
                キャンセル
              </Link>
              <button type="submit" disabled={saving} className="btn-primary">
                {saving ? '保存中...' : '変更を保存'}
              </button>
            </div>
          </form>
        </div>
      </div>

      <DeleteModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        title="食材の削除"
        message={`「${form.name}」を削除しますか？この食材を使用しているレシピにも影響します。`}
        isLoading={deleting}
      />
    </AppLayout>
  )
}
