'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import AppLayout from '@/components/AppLayout'
import type { MonthlyAnalysis } from '@/types/database'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

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

function getPreviousMonth(yearMonth: string): string {
  const [y, m] = yearMonth.split('-').map(Number)
  const d = new Date(y, m - 2, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export default function AnalysisPage() {
  const orgId = useOrgId()
  const supabase = useMemo(() => createClient(), [])

  const now = new Date()
  const [selectedMonth, setSelectedMonth] = useState(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  )

  const [monthlySales, setMonthlySales] = useState(0)
  const [purchaseAmount, setPurchaseAmount] = useState(0)
  const [beginningInventory, setBeginningInventory] = useState(0)
  const [endingInventory, setEndingInventory] = useState(0)
  const [history, setHistory] = useState<MonthlyAnalysis[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [existingId, setExistingId] = useState<string | null>(null)

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

  // Calculated values
  const costOfSales = beginningInventory + purchaseAmount - endingInventory
  const costRate = monthlySales > 0 ? Math.round((costOfSales / monthlySales) * 10000) / 100 : 0

  // Load inventory totals and existing analysis
  const loadMonthData = useCallback(async () => {
    if (!orgId) return
    setLoading(true)
    setError(null)
    try {
      // Load ending inventory from inventory_records for selected month
      const { data: invRecords } = await supabase
        .from('inventory_records')
        .select('total_value')
        .eq('org_id', orgId)
        .eq('year_month', selectedMonth)

      const endInv = invRecords?.reduce((sum, r) => sum + r.total_value, 0) ?? 0
      setEndingInventory(endInv)

      // Load beginning inventory from previous month's inventory_records
      const prevMonth = getPreviousMonth(selectedMonth)
      const { data: prevInvRecords } = await supabase
        .from('inventory_records')
        .select('total_value')
        .eq('org_id', orgId)
        .eq('year_month', prevMonth)

      const begInv = prevInvRecords?.reduce((sum, r) => sum + r.total_value, 0) ?? 0
      setBeginningInventory(begInv)

      // Load existing analysis record
      const { data: existing } = await supabase
        .from('monthly_analyses')
        .select('*')
        .eq('org_id', orgId)
        .eq('year_month', selectedMonth)
        .single()

      if (existing) {
        setMonthlySales(existing.monthly_sales)
        setPurchaseAmount(existing.purchase_amount)
        setExistingId(existing.id)
      } else {
        setMonthlySales(0)
        setPurchaseAmount(0)
        setExistingId(null)
      }
    } catch {
      setError('データの読み込みに失敗しました')
    } finally {
      setLoading(false)
    }
  }, [orgId, selectedMonth, supabase])

  useEffect(() => {
    loadMonthData()
  }, [loadMonthData])

  // Load history
  useEffect(() => {
    if (!orgId) return
    supabase
      .from('monthly_analyses')
      .select('*')
      .eq('org_id', orgId)
      .order('year_month', { ascending: true })
      .then(({ data }) => {
        if (data) setHistory(data)
      })
  }, [orgId, supabase])

  const handleSave = async () => {
    if (!orgId) return
    setSaving(true)
    setError(null)
    try {
      const record = {
        org_id: orgId,
        year_month: selectedMonth,
        monthly_sales: monthlySales,
        purchase_amount: purchaseAmount,
        beginning_inventory: beginningInventory,
        ending_inventory: endingInventory,
        cost_of_sales: costOfSales,
        cost_rate: costRate,
      }

      if (existingId) {
        const { error: updateError } = await supabase
          .from('monthly_analyses')
          .update(record)
          .eq('id', existingId)
        if (updateError) throw updateError
      } else {
        const { data, error: insertError } = await supabase
          .from('monthly_analyses')
          .insert(record)
          .select()
          .single()
        if (insertError) throw insertError
        if (data) setExistingId(data.id)
      }

      // Refresh history
      const { data: refreshed } = await supabase
        .from('monthly_analyses')
        .select('*')
        .eq('org_id', orgId)
        .order('year_month', { ascending: true })
      if (refreshed) setHistory(refreshed)
    } catch {
      setError('保存に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  // Chart data
  const chartData = history.map((h) => ({
    month: h.year_month.replace(/^\d{4}-/, '').replace(/^0/, '') + '月',
    yearMonth: h.year_month,
    cost_rate: h.cost_rate,
    sales: h.monthly_sales,
    cogs: h.cost_of_sales,
  }))

  if (!orgId) {
    return (
      <AppLayout title="原価分析">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">読み込み中...</div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout title="原価分析">
      <div className="space-y-6">
        {/* Month selector */}
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
                </option>
              ))}
            </select>
          </div>
          <button className="btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? '保存中...' : existingId ? '更新' : '新規作成'}
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="text-gray-500">読み込み中...</div>
          </div>
        ) : (
          <>
            {/* Input form */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="card">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">入力項目</h3>
                <div className="space-y-4">
                  <div>
                    <label className="label">月商（税抜）</label>
                    <input
                      type="number"
                      className="input-field"
                      value={monthlySales || ''}
                      onChange={(e) => setMonthlySales(parseFloat(e.target.value) || 0)}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="label">仕入れ高</label>
                    <input
                      type="number"
                      className="input-field"
                      value={purchaseAmount || ''}
                      onChange={(e) => setPurchaseAmount(parseFloat(e.target.value) || 0)}
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>

              <div className="card">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">算出項目</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-600">前月末棚卸</span>
                    <span className="text-sm font-medium">
                      ¥{beginningInventory.toLocaleString('ja-JP')}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-600">仕入れ高</span>
                    <span className="text-sm font-medium">
                      ¥{purchaseAmount.toLocaleString('ja-JP')}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-600">当月末棚卸</span>
                    <span className="text-sm font-medium">
                      ¥{endingInventory.toLocaleString('ja-JP')}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-700 font-medium">売上原価</span>
                    <span className="text-sm font-bold">
                      ¥{costOfSales.toLocaleString('ja-JP')}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm text-gray-700 font-medium">原価率</span>
                    <span
                      className={`text-lg font-bold ${
                        costRate > 35 ? 'text-red-600' : costRate > 30 ? 'text-yellow-600' : 'text-green-600'
                      }`}
                    >
                      {costRate.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Charts */}
            {chartData.length > 1 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="card">
                  <h3 className="text-sm font-semibold text-gray-900 mb-4">原価率推移</h3>
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                      <YAxis unit="%" tick={{ fontSize: 12 }} />
                      <Tooltip
                        formatter={(value: number) => [`${value.toFixed(1)}%`, '原価率']}
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="cost_rate"
                        name="原価率"
                        stroke="#7c3aed"
                        strokeWidth={2}
                        dot={{ r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                <div className="card">
                  <h3 className="text-sm font-semibold text-gray-900 mb-4">売上 vs 売上原価</h3>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip
                        formatter={(value: number, name: string) => [
                          `¥${value.toLocaleString('ja-JP')}`,
                          name,
                        ]}
                      />
                      <Legend />
                      <Bar dataKey="sales" name="月商" fill="#3b82f6" />
                      <Bar dataKey="cogs" name="売上原価" fill="#f59e0b" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* History table */}
            <div className="card p-0 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-sm font-semibold text-gray-900">過去の分析データ</h3>
              </div>
              {history.length === 0 ? (
                <div className="flex items-center justify-center h-32 text-gray-500 text-sm">
                  データがありません
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="table-header">年月</th>
                        <th className="table-header text-right">月商</th>
                        <th className="table-header text-right">仕入れ高</th>
                        <th className="table-header text-right">前月末棚卸</th>
                        <th className="table-header text-right">当月末棚卸</th>
                        <th className="table-header text-right">売上原価</th>
                        <th className="table-header text-right">原価率</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {[...history].reverse().map((h) => (
                        <tr
                          key={h.id}
                          className={`hover:bg-gray-50 cursor-pointer ${
                            h.year_month === selectedMonth ? 'bg-primary-50' : ''
                          }`}
                          onClick={() => setSelectedMonth(h.year_month)}
                        >
                          <td className="table-cell font-medium">
                            {h.year_month.replace('-', '年')}月
                          </td>
                          <td className="table-cell text-right">
                            ¥{h.monthly_sales.toLocaleString('ja-JP')}
                          </td>
                          <td className="table-cell text-right">
                            ¥{h.purchase_amount.toLocaleString('ja-JP')}
                          </td>
                          <td className="table-cell text-right">
                            ¥{h.beginning_inventory.toLocaleString('ja-JP')}
                          </td>
                          <td className="table-cell text-right">
                            ¥{h.ending_inventory.toLocaleString('ja-JP')}
                          </td>
                          <td className="table-cell text-right">
                            ¥{h.cost_of_sales.toLocaleString('ja-JP')}
                          </td>
                          <td className="table-cell text-right">
                            <span
                              className={
                                h.cost_rate > 35
                                  ? 'badge-danger'
                                  : h.cost_rate > 30
                                  ? 'badge-warning'
                                  : 'badge-success'
                              }
                            >
                              {h.cost_rate.toFixed(1)}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </AppLayout>
  )
}
