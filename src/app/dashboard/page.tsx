'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { Package, ChefHat, ClipboardList, Plus, TrendingUp, TrendingDown } from 'lucide-react'
import type { Recipe, MonthlyAnalysis } from '@/types/database'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

function useCurrentUser() {
  const [orgId, setOrgId] = useState<string | null>(null)
  const [userName, setUserName] = useState('')

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase
        .from('profiles')
        .select('org_id, full_name')
        .eq('id', user.id)
        .single()
        .then(({ data }) => {
          if (data) {
            setOrgId(data.org_id)
            setUserName(data.full_name || 'ユーザー')
          }
        })
    })
  }, [])
  return { orgId, userName }
}

type DashboardStats = {
  ingredientCount: number
  recipeCount: number
  avgCostRate: number
  monthlySales: number
}

export default function DashboardPage() {
  const { orgId, userName } = useCurrentUser()
  const supabase = useMemo(() => createClient(), [])

  const [stats, setStats] = useState<DashboardStats>({
    ingredientCount: 0,
    recipeCount: 0,
    avgCostRate: 0,
    monthlySales: 0,
  })
  const [recentRecipes, setRecentRecipes] = useState<Recipe[]>([])
  const [trendData, setTrendData] = useState<{ month: string; cost_rate: number }[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!orgId) return

    const loadDashboard = async () => {
      setLoading(true)
      setError(null)
      try {
        const now = new Date()
        const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

        const [ingredientRes, recipeRes, recentRes, analysisRes, trendRes] = await Promise.all([
          supabase
            .from('ingredients')
            .select('id', { count: 'exact', head: true })
            .eq('org_id', orgId),
          supabase
            .from('recipes')
            .select('id, cost_rate', { count: 'exact' })
            .eq('org_id', orgId),
          supabase
            .from('recipes')
            .select('*')
            .eq('org_id', orgId)
            .order('created_at', { ascending: false })
            .limit(5),
          supabase
            .from('monthly_analyses')
            .select('monthly_sales')
            .eq('org_id', orgId)
            .eq('year_month', currentMonth)
            .single(),
          supabase
            .from('monthly_analyses')
            .select('year_month, cost_rate')
            .eq('org_id', orgId)
            .order('year_month', { ascending: true })
            .limit(6),
        ])

        // Calculate average cost rate from recipes
        const recipes = recipeRes.data ?? []
        const avgRate =
          recipes.length > 0
            ? Math.round(
                (recipes.reduce((sum, r) => sum + (r.cost_rate ?? 0), 0) / recipes.length) * 10
              ) / 10
            : 0

        setStats({
          ingredientCount: ingredientRes.count ?? 0,
          recipeCount: recipeRes.count ?? 0,
          avgCostRate: avgRate,
          monthlySales: analysisRes.data?.monthly_sales ?? 0,
        })

        setRecentRecipes(recentRes.data ?? [])

        setTrendData(
          (trendRes.data ?? []).map((d) => ({
            month: d.year_month.split('-')[1].replace(/^0/, '') + '月',
            cost_rate: d.cost_rate,
          }))
        )
      } catch {
        setError('ダッシュボードデータの読み込みに失敗しました')
      } finally {
        setLoading(false)
      }
    }

    loadDashboard()
  }, [orgId, supabase])

  if (!orgId) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">読み込み中...</div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">読み込み中...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h2 className="text-xl font-bold text-gray-900">
          おかえりなさい、{userName}さん
        </h2>
        <p className="text-sm text-gray-500 mt-1">本日の状況をご確認ください。</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          title="登録食材数"
          value={stats.ingredientCount.toLocaleString()}
          unit="件"
          icon={<Package size={20} className="text-blue-500" />}
          bgColor="bg-blue-50"
        />
        <SummaryCard
          title="メニュー数"
          value={stats.recipeCount.toLocaleString()}
          unit="件"
          icon={<ChefHat size={20} className="text-green-500" />}
          bgColor="bg-green-50"
        />
        <SummaryCard
          title="平均原価率"
          value={stats.avgCostRate.toFixed(1)}
          unit="%"
          icon={
            stats.avgCostRate > 35 ? (
              <TrendingUp size={20} className="text-red-500" />
            ) : (
              <TrendingDown size={20} className="text-emerald-500" />
            )
          }
          bgColor={stats.avgCostRate > 35 ? 'bg-red-50' : 'bg-emerald-50'}
        />
        <SummaryCard
          title="今月の売上"
          value={`¥${stats.monthlySales.toLocaleString('ja-JP')}`}
          unit=""
          icon={<ClipboardList size={20} className="text-purple-500" />}
          bgColor="bg-purple-50"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent recipes */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-900">最近のレシピ</h3>
            <Link href="/recipes" className="text-xs text-primary-600 hover:underline">
              すべて表示
            </Link>
          </div>
          {recentRecipes.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-6">
              レシピがまだ登録されていません
            </p>
          ) : (
            <div className="space-y-3">
              {recentRecipes.map((recipe) => (
                <Link
                  key={recipe.id}
                  href={`/recipes/${recipe.id}`}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{recipe.name}</p>
                    <p className="text-xs text-gray-500">{recipe.category}</p>
                  </div>
                  <div className="flex items-center gap-3 ml-3 flex-shrink-0">
                    <span className="text-sm text-gray-700">
                      ¥{recipe.selling_price.toLocaleString('ja-JP')}
                    </span>
                    <span
                      className={
                        recipe.cost_rate > 35
                          ? 'badge-danger'
                          : recipe.cost_rate > 30
                          ? 'badge-warning'
                          : 'badge-success'
                      }
                    >
                      {recipe.cost_rate.toFixed(1)}%
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Cost rate trend */}
        <div className="card">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">原価率推移（直近6ヶ月）</h3>
          {trendData.length < 2 ? (
            <p className="text-sm text-gray-500 text-center py-6">
              データが不足しています（2ヶ月以上の分析データが必要です）
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis unit="%" tick={{ fontSize: 12 }} domain={['auto', 'auto']} />
                <Tooltip formatter={(value: number) => [`${value.toFixed(1)}%`, '原価率']} />
                <Line
                  type="monotone"
                  dataKey="cost_rate"
                  stroke="#7c3aed"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div className="card">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">クイック操作</h3>
        <div className="flex flex-wrap gap-3">
          <Link href="/ingredients/new" className="btn-primary flex items-center gap-2">
            <Plus size={16} />
            食材追加
          </Link>
          <Link href="/recipes/new" className="btn-primary flex items-center gap-2">
            <Plus size={16} />
            レシピ追加
          </Link>
          <Link href="/inventory" className="btn-secondary flex items-center gap-2">
            <ClipboardList size={16} />
            棚卸入力
          </Link>
        </div>
      </div>
    </div>
  )
}

function SummaryCard({
  title,
  value,
  unit,
  icon,
  bgColor,
}: {
  title: string
  value: string
  unit: string
  icon: React.ReactNode
  bgColor: string
}) {
  return (
    <div className="card">
      <div className="flex items-center gap-3 mb-3">
        <div className={`p-2 rounded-lg ${bgColor}`}>{icon}</div>
        <span className="text-sm text-gray-600">{title}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-bold text-gray-900">{value}</span>
        {unit && <span className="text-sm text-gray-500">{unit}</span>}
      </div>
    </div>
  )
}
