'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Search, Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import AppLayout from '@/components/AppLayout'
import type { Recipe } from '@/types/database'

const CATEGORIES = ['すべて', '肉', 'サイド', 'ドリンク', 'デザート', '麺', 'その他']

function getCostRateBadge(rate: number) {
  if (rate < 25) return 'badge-green'
  if (rate < 35) return 'badge-blue'
  if (rate < 45) return 'badge-yellow'
  return 'badge-red'
}

export default function RecipesPage() {
  const supabase = createClient()

  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [filtered, setFiltered] = useState<Recipe[]>([])
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('すべて')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [orgName, setOrgName] = useState('マイ店舗')

  const fetchAll = useCallback(async () => {
    setLoading(true)
    setError(null)

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    const { data: profile } = await supabase
      .from('profiles')
      .select('*, organization:organizations(*)')
      .eq('id', user.id)
      .single()

    if (!profile) return
    setOrgName((profile as any).organization?.name ?? 'マイ店舗')

    const { data, error: fetchError } = await supabase
      .from('recipes')
      .select('*')
      .eq('org_id', profile.org_id)
      .order('category')
      .order('name')

    if (fetchError) {
      setError('メニューレシピの取得に失敗しました。')
      console.error(fetchError)
    } else {
      setRecipes(data ?? [])
    }
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  useEffect(() => {
    let result = recipes
    if (category !== 'すべて') {
      result = result.filter((r) => r.category === category)
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter((r) => r.name.toLowerCase().includes(q))
    }
    setFiltered(result)
  }, [search, category, recipes])

  const formatCurrency = (value: number) =>
    `¥${value.toLocaleString('ja-JP', { maximumFractionDigits: 0 })}`

  // Derive category tabs from actual data + defaults
  const availableCategories = [
    'すべて',
    ...Array.from(new Set(recipes.map((r) => r.category))).sort(),
  ]

  return (
    <AppLayout title="メニューレシピ" orgName={orgName}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder="メニューを検索..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-10 w-full"
          />
        </div>
        <Link href="/recipes/new" className="btn-primary inline-flex items-center gap-2">
          <Plus size={18} />
          新規追加
        </Link>
      </div>

      {/* Category tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {availableCategories.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              category === cat
                ? 'bg-primary-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            {cat}
            {cat !== 'すべて' && (
              <span className="ml-1.5 text-xs opacity-75">
                ({recipes.filter((r) => r.category === cat).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="card p-12 text-center text-gray-500">読み込み中...</div>
      ) : error ? (
        <div className="card p-12 text-center text-red-600">{error}</div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center text-gray-500">
          {search || category !== 'すべて'
            ? '条件に一致するレシピがありません。'
            : 'メニューレシピがまだ登録されていません。'}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((recipe) => (
            <Link
              key={recipe.id}
              href={`/recipes/${recipe.id}`}
              className="card p-5 hover:shadow-md transition-shadow group"
            >
              {/* Image placeholder */}
              {recipe.image_url ? (
                <div className="w-full h-36 rounded-lg mb-3 overflow-hidden bg-gray-100">
                  <img
                    src={recipe.image_url}
                    alt={recipe.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-full h-36 rounded-lg mb-3 bg-gray-100 flex items-center justify-center">
                  <span className="text-gray-400 text-sm">画像なし</span>
                </div>
              )}

              {/* Header */}
              <div className="flex items-start justify-between gap-2 mb-3">
                <h3 className="font-semibold text-gray-900 group-hover:text-primary-600 transition-colors">
                  {recipe.name}
                </h3>
                <span className={`${getCostRateBadge(recipe.cost_rate)} flex-shrink-0`}>
                  {recipe.cost_rate.toFixed(1)}%
                </span>
              </div>

              {/* Details */}
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">原価</span>
                  <span className="font-medium text-gray-900">
                    {formatCurrency(recipe.cost)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">売価</span>
                  <span className="font-medium text-gray-900">
                    {formatCurrency(recipe.selling_price)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">原価率</span>
                  <span className="font-medium text-gray-900">
                    {recipe.cost_rate.toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between border-t border-gray-100 pt-1.5">
                  <span className="text-gray-500">粗利</span>
                  <span className="font-bold text-green-700">
                    {formatCurrency(recipe.gross_profit)}
                  </span>
                </div>
              </div>

              {/* Category */}
              <div className="mt-3">
                <span className="badge-blue text-xs">{recipe.category}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </AppLayout>
  )
}
