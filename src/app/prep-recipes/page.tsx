'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Search, Plus, Pencil, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import AppLayout from '@/components/AppLayout'
import type { PrepRecipe, Profile } from '@/types/database'

export default function PrepRecipesPage() {
  const router = useRouter()
  const supabase = createClient()

  const [recipes, setRecipes] = useState<PrepRecipe[]>([])
  const [filtered, setFiltered] = useState<PrepRecipe[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [orgId, setOrgId] = useState<string | null>(null)
  const [orgName, setOrgName] = useState('マイ店舗')

  const fetchProfile = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return null
    }
    const { data: profile } = await supabase
      .from('profiles')
      .select('*, organization:organizations(*)')
      .eq('id', user.id)
      .single()
    if (profile) {
      setOrgId(profile.org_id)
      setOrgName((profile as Profile & { organization?: { name: string } }).organization?.name ?? 'マイ店舗')
    }
    return profile
  }, [supabase, router])

  const fetchRecipes = useCallback(
    async (organizationId: string) => {
      setLoading(true)
      setError(null)
      const { data, error: fetchError } = await supabase
        .from('prep_recipes')
        .select('*')
        .eq('org_id', organizationId)
        .order('name')
      if (fetchError) {
        setError('仕込みレシピの取得に失敗しました。')
        console.error(fetchError)
      } else {
        setRecipes(data ?? [])
      }
      setLoading(false)
    },
    [supabase]
  )

  useEffect(() => {
    const init = async () => {
      const profile = await fetchProfile()
      if (profile?.org_id) {
        await fetchRecipes(profile.org_id)
      }
    }
    init()
  }, [fetchProfile, fetchRecipes])

  useEffect(() => {
    if (!search.trim()) {
      setFiltered(recipes)
    } else {
      const q = search.toLowerCase()
      setFiltered(recipes.filter((r) => r.name.toLowerCase().includes(q)))
    }
  }, [search, recipes])

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`「${name}」を削除しますか？この操作は元に戻せません。`)) return

    const { error: deleteError } = await supabase
      .from('prep_recipe_items')
      .delete()
      .eq('prep_recipe_id', id)

    if (deleteError) {
      alert('削除に失敗しました。')
      console.error(deleteError)
      return
    }

    const { error: recipeDeleteError } = await supabase
      .from('prep_recipes')
      .delete()
      .eq('id', id)

    if (recipeDeleteError) {
      alert('削除に失敗しました。')
      console.error(recipeDeleteError)
      return
    }

    setRecipes((prev) => prev.filter((r) => r.id !== id))
  }

  const formatCurrency = (value: number) =>
    `¥${value.toLocaleString('ja-JP', { maximumFractionDigits: 0 })}`

  const formatCostPerGram = (value: number) =>
    `${value.toFixed(2)}円/g`

  return (
    <AppLayout title="仕込みレシピ" orgName={orgName}>
      {/* Header actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder="仕込みレシピを検索..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-10 w-full"
          />
        </div>
        <Link href="/prep-recipes/new" className="btn-primary inline-flex items-center gap-2">
          <Plus size={18} />
          新規追加
        </Link>
      </div>

      {/* Content */}
      {loading ? (
        <div className="card p-12 text-center text-gray-500">読み込み中...</div>
      ) : error ? (
        <div className="card p-12 text-center text-red-600">{error}</div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center text-gray-500">
          {search ? '検索結果がありません。' : '仕込みレシピがまだ登録されていません。'}
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="table-header">仕込み名</th>
                  <th className="table-header text-right">総量(g)</th>
                  <th className="table-header text-right">原価合計</th>
                  <th className="table-header text-right">g単価</th>
                  <th className="table-header text-center">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((recipe) => (
                  <tr key={recipe.id} className="hover:bg-gray-50 transition-colors">
                    <td className="table-cell font-medium text-gray-900">
                      {recipe.name}
                    </td>
                    <td className="table-cell text-right text-gray-700">
                      {recipe.total_weight_g.toLocaleString('ja-JP')}g
                    </td>
                    <td className="table-cell text-right text-gray-700">
                      {formatCurrency(recipe.total_cost)}
                    </td>
                    <td className="table-cell text-right text-gray-700">
                      {formatCostPerGram(recipe.cost_per_gram)}
                    </td>
                    <td className="table-cell text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Link
                          href={`/prep-recipes/${recipe.id}`}
                          className="btn-secondary inline-flex items-center gap-1 text-sm px-3 py-1.5"
                        >
                          <Pencil size={14} />
                          編集
                        </Link>
                        <button
                          onClick={() => handleDelete(recipe.id, recipe.name)}
                          className="inline-flex items-center gap-1 text-sm px-3 py-1.5 rounded-lg
                                     text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 size={14} />
                          削除
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
