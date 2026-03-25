'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import AppLayout from '@/components/AppLayout'

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

const initialForm: FormData = {
  name: '',
  supplier_id: '',
  specification: '',
  unit: 'g',
  purchase_price: '',
  unit_cost: '',
  cost_unit: 'g',
}

export default function NewIngredientPage() {
  const router = useRouter()
  const supabase = createClient()

  const [form, setForm] = useState<FormData>(initialForm)
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({})
  const [orgId, setOrgId] = useState<string | null>(null)

  useEffect(() => {
    fetchInitialData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function fetchInitialData() {
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

    if (profile?.org_id) {
      setOrgId(profile.org_id)

      const { data } = await supabase
        .from('suppliers')
        .select('id, name')
        .eq('org_id', profile.org_id)
        .order('name')

      setSuppliers(data ?? [])
    }
  }

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) {
    const { name, value } = e.target
    setForm((prev) => {
      const updated = { ...prev, [name]: value }

      // Auto-calculate unit_cost when purchase_price and specification change
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

    // Clear field error on change
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
    if (!validate() || !orgId) return

    try {
      setLoading(true)

      const payload = {
        name: form.name.trim(),
        supplier_id: form.supplier_id || null,
        specification: form.specification || null,
        unit: form.unit || null,
        purchase_price: form.purchase_price ? Number(form.purchase_price) : null,
        unit_cost: form.unit_cost ? Number(form.unit_cost) : null,
        cost_unit: form.cost_unit || null,
        org_id: orgId,
      }

      const { error } = await supabase.from('ingredients').insert(payload)
      if (error) throw error

      router.push('/ingredients')
    } catch (err) {
      console.error(err)
      alert('食材の追加に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AppLayout
      title="食材追加"
      actions={
        <Link
          href="/ingredients"
          className="btn-secondary inline-flex items-center gap-2"
        >
          <ArrowLeft size={16} />
          戻る
        </Link>
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
            <div className="grid grid-cols-2 gap-4">
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
            <div className="grid grid-cols-2 gap-4">
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
              <button type="submit" disabled={loading} className="btn-primary">
                {loading ? '保存中...' : '食材を追加'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </AppLayout>
  )
}
