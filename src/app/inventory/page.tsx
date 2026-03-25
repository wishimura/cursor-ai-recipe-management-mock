'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import AppLayout from '@/components/AppLayout'
import type { Ingredient, PrepRecipe, InventoryRecord } from '@/types/database'

type InventoryRow = {
  item_type: 'ingredient' | 'prep_recipe'
  ingredient_id: string | null
  prep_recipe_id: string | null
  item_name: string
  unit_cost: number
  quantity: number
  total_value: number
}

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

export default function InventoryPage() {
  const orgId = useOrgId()
  const supabase = useMemo(() => createClient(), [])

  const now = new Date()
  const [selectedMonth, setSelectedMonth] = useState(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  )
  const [activeTab, setActiveTab] = useState<'ingredient' | 'prep_recipe'>('ingredient')

  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [prepRecipes, setPrepRecipes] = useState<PrepRecipe[]>([])
  const [rows, setRows] = useState<InventoryRow[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [months, setMonths] = useState<string[]>([])

  // Generate month options (last 24 months)
  const monthOptions = useMemo(() => {
    const options: string[] = []
    const d = new Date()
    for (let i = 0; i < 24; i++) {
      const y = d.getFullYear()
      const m = String(d.getMonth() + 1).padStart(2, '0')
      options.push(`${y}-${m}`)
      d.setMonth(d.getMonth() - 1)
    }
    return options
  }, [])

  // Load master data
  useEffect(() => {
    if (!orgId) return
    const load = async () => {
      const [ingRes, prepRes] = await Promise.all([
        supabase.from('ingredients').select('*').eq('org_id', orgId).order('name'),
        supabase.from('prep_recipes').select('*').eq('org_id', orgId).order('name'),
      ])
      if (ingRes.data) setIngredients(ingRes.data)
      if (prepRes.data) setPrepRecipes(prepRes.data)
    }
    load()
  }, [orgId, supabase])

  // Load existing months
  useEffect(() => {
    if (!orgId) return
    supabase
      .from('inventory_records')
      .select('year_month')
      .eq('org_id', orgId)
      .then(({ data }) => {
        if (data) {
          const unique = [...new Set(data.map((r) => r.year_month))].sort().reverse()
          setMonths(unique)
        }
      })
  }, [orgId, supabase])

  // Build rows from master data + existing records
  const loadRows = useCallback(async () => {
    if (!orgId) return
    setLoading(true)
    setError(null)
    try {
      const { data: existingRecords } = await supabase
        .from('inventory_records')
        .select('*')
        .eq('org_id', orgId)
        .eq('year_month', selectedMonth)

      const recordMap = new Map<string, InventoryRecord>()
      existingRecords?.forEach((r) => {
        const key = r.item_type === 'ingredient' ? `ing-${r.ingredient_id}` : `prep-${r.prep_recipe_id}`
        recordMap.set(key, r)
      })

      const ingredientRows: InventoryRow[] = ingredients.map((ing) => {
        const existing = recordMap.get(`ing-${ing.id}`)
        return {
          item_type: 'ingredient',
          ingredient_id: ing.id,
          prep_recipe_id: null,
          item_name: ing.name,
          unit_cost: ing.unit_cost,
          quantity: existing?.quantity ?? 0,
          total_value: existing?.total_value ?? 0,
        }
      })

      const prepRows: InventoryRow[] = prepRecipes.map((pr) => {
        const existing = recordMap.get(`prep-${pr.id}`)
        return {
          item_type: 'prep_recipe',
          ingredient_id: null,
          prep_recipe_id: pr.id,
          item_name: pr.name,
          unit_cost: pr.cost_per_gram,
          quantity: existing?.quantity ?? 0,
          total_value: existing?.total_value ?? 0,
        }
      })

      setRows([...ingredientRows, ...prepRows])
    } catch {
      setError('データの読み込みに失敗しました')
    } finally {
      setLoading(false)
    }
  }, [orgId, selectedMonth, ingredients, prepRecipes, supabase])

  useEffect(() => {
    if (ingredients.length > 0 || prepRecipes.length > 0) {
      loadRows()
    }
  }, [loadRows, ingredients.length, prepRecipes.length])

  const handleQuantityChange = (index: number, value: string) => {
    const qty = parseFloat(value) || 0
    setRows((prev) => {
      const updated = [...prev]
      updated[index] = {
        ...updated[index],
        quantity: qty,
        total_value: Math.round(qty * updated[index].unit_cost * 100) / 100,
      }
      return updated
    })
  }

  const filteredRows = rows.filter((r) => r.item_type === activeTab)

  const totalValue = rows.reduce((sum, r) => sum + r.total_value, 0)
  const tabTotal = filteredRows.reduce((sum, r) => sum + r.total_value, 0)

  const handleSave = async () => {
    if (!orgId) return
    setSaving(true)
    setError(null)
    try {
      // Delete existing records for this month
      await supabase
        .from('inventory_records')
        .delete()
        .eq('org_id', orgId)
        .eq('year_month', selectedMonth)

      // Insert all rows that have quantity > 0
      const toInsert = rows
        .filter((r) => r.quantity > 0)
        .map((r) => ({
          org_id: orgId,
          year_month: selectedMonth,
          item_type: r.item_type,
          ingredient_id: r.ingredient_id,
          prep_recipe_id: r.prep_recipe_id,
          item_name: r.item_name,
          quantity: r.quantity,
          unit_cost: r.unit_cost,
          total_value: r.total_value,
        }))

      if (toInsert.length > 0) {
        const { error: insertError } = await supabase
          .from('inventory_records')
          .insert(toInsert)
        if (insertError) throw insertError
      }

      // Refresh months list
      if (!months.includes(selectedMonth)) {
        setMonths((prev) => [selectedMonth, ...prev].sort().reverse())
      }
    } catch {
      setError('保存に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  const handleCreateNewMonth = () => {
    const next = prompt('年月を入力してください（例: 2026-04）')
    if (next && /^\d{4}-\d{2}$/.test(next)) {
      setSelectedMonth(next)
    }
  }

  if (!orgId) {
    return (
      <AppLayout title="棚卸管理">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">読み込み中...</div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout title="棚卸管理">
      <div className="space-y-6">
        {/* Header controls */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <label className="label mb-0">対象年月</label>
            <select
              className="input-field w-auto"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
            >
              {monthOptions.map((m) => (
                <option key={m} value={m}>
                  {m.replace('-', '年')}月
                  {months.includes(m) ? ' ✓' : ''}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <button className="btn-secondary" onClick={handleCreateNewMonth}>
              新しい月を作成
            </button>
            <button className="btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? '保存中...' : '保存'}
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex gap-4">
            <button
              className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'ingredient'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('ingredient')}
            >
              食材棚卸
            </button>
            <button
              className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'prep_recipe'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('prep_recipe')}
            >
              仕込み棚卸
            </button>
          </nav>
        </div>

        {/* Table */}
        <div className="card p-0 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <div className="text-gray-500">読み込み中...</div>
            </div>
          ) : filteredRows.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-gray-500 text-sm">
              {activeTab === 'ingredient'
                ? '食材が登録されていません'
                : '仕込みレシピが登録されていません'}
            </div>
          ) : (
            <>
            {/* Mobile card view */}
            <div className="sm:hidden space-y-3 p-4">
              {filteredRows.map((row) => {
                const globalIdx = rows.findIndex(
                  (r) =>
                    r.item_type === row.item_type &&
                    r.ingredient_id === row.ingredient_id &&
                    r.prep_recipe_id === row.prep_recipe_id
                )
                return (
                  <div
                    key={`${row.item_type}-${row.ingredient_id || row.prep_recipe_id}`}
                    className="bg-white rounded-lg border border-gray-200 p-4"
                  >
                    <div className="flex justify-between items-start">
                      <p className="font-bold text-gray-900">{row.item_name}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm mt-3">
                      <span className="text-gray-500">単位原価</span>
                      <span className="text-gray-900">¥{row.unit_cost.toLocaleString('ja-JP', { minimumFractionDigits: 2 })}</span>
                      <span className="text-gray-500">数量</span>
                      <div>
                        <input
                          type="number"
                          className="input-field text-right w-full"
                          min="0"
                          step="0.1"
                          value={row.quantity || ''}
                          onChange={(e) => handleQuantityChange(globalIdx, e.target.value)}
                          placeholder="0"
                        />
                      </div>
                      <span className="text-gray-500">金額</span>
                      <span className="text-gray-900 font-medium">¥{row.total_value.toLocaleString('ja-JP', { minimumFractionDigits: 0 })}</span>
                    </div>
                  </div>
                )
              })}
            </div>
            {/* Desktop table view */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="table-header">品名</th>
                    <th className="table-header text-right">単位原価</th>
                    <th className="table-header text-right w-32">数量</th>
                    <th className="table-header text-right">金額</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredRows.map((row) => {
                    const globalIdx = rows.findIndex(
                      (r) =>
                        r.item_type === row.item_type &&
                        r.ingredient_id === row.ingredient_id &&
                        r.prep_recipe_id === row.prep_recipe_id
                    )
                    return (
                      <tr key={`${row.item_type}-${row.ingredient_id || row.prep_recipe_id}`} className="hover:bg-gray-50">
                        <td className="table-cell font-medium">{row.item_name}</td>
                        <td className="table-cell text-right">
                          ¥{row.unit_cost.toLocaleString('ja-JP', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="table-cell text-right">
                          <input
                            type="number"
                            className="input-field text-right w-28"
                            min="0"
                            step="0.1"
                            value={row.quantity || ''}
                            onChange={(e) => handleQuantityChange(globalIdx, e.target.value)}
                            placeholder="0"
                          />
                        </td>
                        <td className="table-cell text-right font-medium">
                          ¥{row.total_value.toLocaleString('ja-JP', { minimumFractionDigits: 0 })}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            </>
          )}
        </div>

        {/* Summary bar */}
        <div className="card bg-primary-50 border-primary-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="text-sm text-gray-700">
              <span className="font-medium">
                {activeTab === 'ingredient' ? '食材棚卸' : '仕込み棚卸'}合計:
              </span>{' '}
              ¥{tabTotal.toLocaleString('ja-JP')}
            </div>
            <div className="text-lg font-bold text-primary-700">
              棚卸合計: ¥{totalValue.toLocaleString('ja-JP')}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
