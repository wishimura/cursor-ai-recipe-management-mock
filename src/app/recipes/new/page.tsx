'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Plus, Trash2, ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import AppLayout from '@/components/AppLayout'
import type { Ingredient, PrepRecipe } from '@/types/database'

const CATEGORIES = ['肉', 'サイド', 'ドリンク', 'デザート', '麺', 'その他']

type ItemRow = {
  key: string
  item_type: 'ingredient' | 'prep_recipe'
  ingredient_id: string | null
  prep_recipe_id: string | null
  name: string
  quantity: number
  unit: string
  unit_cost: number
  cost: number
  searchQuery: string
  showDropdown: boolean
}

const emptyRow = (): ItemRow => ({
  key: crypto.randomUUID(),
  item_type: 'ingredient',
  ingredient_id: null,
  prep_recipe_id: null,
  name: '',
  quantity: 0,
  unit: 'g',
  unit_cost: 0,
  cost: 0,
  searchQuery: '',
  showDropdown: false,
})

export default function NewRecipePage() {
  const router = useRouter()
  const supabase = createClient()

  const [recipeName, setRecipeName] = useState('')
  const [categoryValue, setCategoryValue] = useState(CATEGORIES[0])
  const [sellingPrice, setSellingPrice] = useState<number>(0)
  const [notes, setNotes] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [items, setItems] = useState<ItemRow[]>([emptyRow()])
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [prepRecipes, setPrepRecipes] = useState<PrepRecipe[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [orgId, setOrgId] = useState<string | null>(null)
  const [orgName, setOrgName] = useState('マイ店舗')

  const fetchData = useCallback(async () => {
    setLoading(true)

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('*, organization:organizations(*)')
      .eq('id', user.id)
      .single()

    if (!profile) {
      router.push('/login')
      return
    }

    setOrgId(profile.org_id)
    setOrgName((profile as any).organization?.name ?? 'マイ店舗')

    const [ingredientRes, prepRes] = await Promise.all([
      supabase.from('ingredients').select('*').eq('org_id', profile.org_id).order('name'),
      supabase.from('prep_recipes').select('*').eq('org_id', profile.org_id).order('name'),
    ])

    setIngredients(ingredientRes.data ?? [])
    setPrepRecipes(prepRes.data ?? [])
    setLoading(false)
  }, [supabase, router])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const updateItem = (index: number, updates: Partial<ItemRow>) => {
    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item
        const updated = { ...item, ...updates }
        if ('quantity' in updates || 'unit_cost' in updates) {
          updated.cost = updated.quantity * updated.unit_cost
        }
        return updated
      })
    )
  }

  const selectIngredientForRow = (index: number, ingredient: Ingredient) => {
    updateItem(index, {
      ingredient_id: ingredient.id,
      prep_recipe_id: null,
      name: ingredient.name,
      unit: ingredient.cost_unit || ingredient.unit,
      unit_cost: ingredient.unit_cost,
      cost: items[index].quantity * ingredient.unit_cost,
      searchQuery: ingredient.name,
      showDropdown: false,
    })
  }

  const selectPrepRecipeForRow = (index: number, prep: PrepRecipe) => {
    updateItem(index, {
      prep_recipe_id: prep.id,
      ingredient_id: null,
      name: prep.name,
      unit: 'g',
      unit_cost: prep.cost_per_gram,
      cost: items[index].quantity * prep.cost_per_gram,
      searchQuery: prep.name,
      showDropdown: false,
    })
  }

  const addRow = () => setItems((prev) => [...prev, emptyRow()])

  const removeRow = (index: number) => {
    if (items.length <= 1) return
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  const totalCost = items.reduce((sum, item) => sum + item.cost, 0)
  const costRate = sellingPrice > 0 ? (totalCost / sellingPrice) * 100 : 0
  const grossProfit = sellingPrice - totalCost

  const getFilteredOptions = (item: ItemRow) => {
    const q = item.searchQuery.toLowerCase()
    if (item.item_type === 'ingredient') {
      return !q
        ? ingredients
        : ingredients.filter((ing) => ing.name.toLowerCase().includes(q))
    }
    return !q
      ? prepRecipes
      : prepRecipes.filter((pr) => pr.name.toLowerCase().includes(q))
  }

  const getCostRateColor = () => {
    if (costRate < 25) return 'text-green-600'
    if (costRate < 35) return 'text-blue-600'
    if (costRate < 45) return 'text-yellow-600'
    return 'text-red-600'
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!orgId || !recipeName.trim() || sellingPrice <= 0) return
    if (items.some((item) => !item.name.trim() || item.quantity <= 0)) {
      alert('すべての材料に名前と数量を入力してください。')
      return
    }

    setSubmitting(true)

    const { data: recipe, error: recipeError } = await supabase
      .from('recipes')
      .insert({
        org_id: orgId,
        name: recipeName.trim(),
        category: categoryValue,
        selling_price: sellingPrice,
        cost: totalCost,
        cost_rate: costRate,
        gross_profit: grossProfit,
        notes: notes.trim() || null,
        image_url: imageUrl.trim() || null,
      })
      .select()
      .single()

    if (recipeError || !recipe) {
      alert('保存に失敗しました。')
      console.error(recipeError)
      setSubmitting(false)
      return
    }

    const itemsToInsert = items.map((item) => ({
      recipe_id: recipe.id,
      item_type: item.item_type,
      ingredient_id: item.ingredient_id,
      prep_recipe_id: item.prep_recipe_id,
      name: item.name,
      quantity: item.quantity,
      unit: item.unit,
      unit_cost: item.unit_cost,
      cost: item.cost,
    }))

    const { error: itemsError } = await supabase
      .from('recipe_items')
      .insert(itemsToInsert)

    if (itemsError) {
      alert('材料の保存に失敗しました。')
      console.error(itemsError)
      setSubmitting(false)
      return
    }

    router.push('/recipes')
  }

  if (loading) {
    return (
      <AppLayout title="メニューレシピ追加" orgName={orgName}>
        <div className="card p-12 text-center text-gray-500">読み込み中...</div>
      </AppLayout>
    )
  }

  return (
    <AppLayout title="メニューレシピ追加" orgName={orgName}>
      <div className="mb-4">
        <Link
          href="/recipes"
          className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft size={16} />
          一覧に戻る
        </Link>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Basic info */}
        <div className="card p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">基本情報</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="sm:col-span-2">
              <label className="label">メニュー名 *</label>
              <input
                type="text"
                value={recipeName}
                onChange={(e) => setRecipeName(e.target.value)}
                className="input-field w-full"
                placeholder="例: チキン南蛮定食"
                required
              />
            </div>
            <div>
              <label className="label">カテゴリ *</label>
              <select
                value={categoryValue}
                onChange={(e) => setCategoryValue(e.target.value)}
                className="input-field w-full"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">売価 (税込) *</label>
              <input
                type="number"
                value={sellingPrice || ''}
                onChange={(e) => setSellingPrice(parseFloat(e.target.value) || 0)}
                className="input-field w-full"
                placeholder="0"
                min="0"
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            <div>
              <label className="label">画像URL</label>
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                className="input-field w-full"
                placeholder="https://example.com/image.jpg"
              />
            </div>
            <div>
              <label className="label">備考</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="input-field w-full"
                placeholder="メモ"
              />
            </div>
          </div>
        </div>

        {/* Item rows */}
        <div className="card p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">材料・仕込み一覧</h2>
            <button type="button" onClick={addRow} className="btn-secondary inline-flex items-center gap-1 text-sm">
              <Plus size={16} />
              行を追加
            </button>
          </div>

          <div className="space-y-3">
            <div className="hidden lg:grid lg:grid-cols-12 gap-2 text-xs font-medium text-gray-500 px-1">
              <div className="col-span-2">種別</div>
              <div className="col-span-3">名前</div>
              <div className="col-span-2">数量</div>
              <div className="col-span-1">単位</div>
              <div className="col-span-1">単価</div>
              <div className="col-span-2">原価</div>
              <div className="col-span-1"></div>
            </div>

            {items.map((item, index) => (
              <div
                key={item.key}
                className="grid grid-cols-1 lg:grid-cols-12 gap-2 items-start p-3 bg-gray-50 rounded-lg"
              >
                {/* Type toggle */}
                <div className="lg:col-span-2">
                  <label className="label lg:hidden">種別</label>
                  <select
                    value={item.item_type}
                    onChange={(e) => {
                      const newType = e.target.value as 'ingredient' | 'prep_recipe'
                      updateItem(index, {
                        item_type: newType,
                        ingredient_id: null,
                        prep_recipe_id: null,
                        name: '',
                        unit_cost: 0,
                        cost: 0,
                        searchQuery: '',
                      })
                    }}
                    className="input-field w-full"
                  >
                    <option value="ingredient">食材</option>
                    <option value="prep_recipe">仕込み</option>
                  </select>
                </div>

                {/* Name search */}
                <div className="lg:col-span-3 relative">
                  <label className="label lg:hidden">名前</label>
                  <input
                    type="text"
                    value={item.showDropdown ? item.searchQuery : item.name}
                    onChange={(e) =>
                      updateItem(index, {
                        searchQuery: e.target.value,
                        showDropdown: true,
                        name: e.target.value,
                        ingredient_id: null,
                        prep_recipe_id: null,
                      })
                    }
                    onFocus={() => updateItem(index, { showDropdown: true, searchQuery: item.name })}
                    onBlur={() => setTimeout(() => updateItem(index, { showDropdown: false }), 200)}
                    className="input-field w-full"
                    placeholder={item.item_type === 'ingredient' ? '食材を検索...' : '仕込みを検索...'}
                  />
                  {item.showDropdown && (
                    <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {item.item_type === 'ingredient'
                        ? (getFilteredOptions(item) as Ingredient[]).map((ing) => (
                            <button
                              key={ing.id}
                              type="button"
                              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors"
                              onMouseDown={() => selectIngredientForRow(index, ing)}
                            >
                              <span className="font-medium">{ing.name}</span>
                              <span className="text-gray-500 ml-2">
                                ¥{ing.unit_cost}/{ing.cost_unit || ing.unit}
                              </span>
                            </button>
                          ))
                        : (getFilteredOptions(item) as PrepRecipe[]).map((pr) => (
                            <button
                              key={pr.id}
                              type="button"
                              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors"
                              onMouseDown={() => selectPrepRecipeForRow(index, pr)}
                            >
                              <span className="font-medium">{pr.name}</span>
                              <span className="text-gray-500 ml-2">
                                {pr.cost_per_gram.toFixed(2)}円/g
                              </span>
                            </button>
                          ))}
                      {getFilteredOptions(item).length === 0 && (
                        <div className="px-3 py-2 text-sm text-gray-400">該当なし</div>
                      )}
                    </div>
                  )}
                </div>

                {/* Quantity */}
                <div className="lg:col-span-2">
                  <label className="label lg:hidden">数量</label>
                  <input
                    type="number"
                    value={item.quantity || ''}
                    onChange={(e) =>
                      updateItem(index, { quantity: parseFloat(e.target.value) || 0 })
                    }
                    className="input-field w-full"
                    placeholder="0"
                    min="0"
                    step="any"
                  />
                </div>

                {/* Unit */}
                <div className="lg:col-span-1">
                  <label className="label lg:hidden">単位</label>
                  <input
                    type="text"
                    value={item.unit}
                    onChange={(e) => updateItem(index, { unit: e.target.value })}
                    className="input-field w-full"
                  />
                </div>

                {/* Unit cost */}
                <div className="lg:col-span-1">
                  <label className="label lg:hidden">単価</label>
                  <input
                    type="number"
                    value={item.unit_cost || ''}
                    onChange={(e) =>
                      updateItem(index, { unit_cost: parseFloat(e.target.value) || 0 })
                    }
                    className="input-field w-full bg-gray-100"
                    step="any"
                  />
                </div>

                {/* Cost */}
                <div className="lg:col-span-2">
                  <label className="label lg:hidden">原価</label>
                  <div className="input-field w-full bg-gray-100 text-gray-700">
                    ¥{item.cost.toLocaleString('ja-JP', { maximumFractionDigits: 1 })}
                  </div>
                </div>

                {/* Delete */}
                <div className="lg:col-span-1 flex items-end justify-end">
                  <button
                    type="button"
                    onClick={() => removeRow(index)}
                    disabled={items.length <= 1}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Cost summary */}
        <div className="card p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">原価サマリー</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <p className="text-sm text-gray-500 mb-1">原価合計</p>
              <p className="text-2xl font-bold text-gray-900">
                ¥{totalCost.toLocaleString('ja-JP', { maximumFractionDigits: 0 })}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <p className="text-sm text-gray-500 mb-1">売価</p>
              <p className="text-2xl font-bold text-gray-900">
                ¥{sellingPrice.toLocaleString('ja-JP', { maximumFractionDigits: 0 })}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <p className="text-sm text-gray-500 mb-1">原価率</p>
              <p className={`text-2xl font-bold ${getCostRateColor()}`}>
                {costRate.toFixed(1)}%
              </p>
            </div>
            <div className="bg-green-50 rounded-lg p-4 text-center">
              <p className="text-sm text-green-600 mb-1">粗利</p>
              <p className="text-2xl font-bold text-green-900">
                ¥{grossProfit.toLocaleString('ja-JP', { maximumFractionDigits: 0 })}
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <Link href="/recipes" className="btn-secondary">
            キャンセル
          </Link>
          <button type="submit" disabled={submitting} className="btn-primary">
            {submitting ? '保存中...' : '保存する'}
          </button>
        </div>
      </form>
    </AppLayout>
  )
}
