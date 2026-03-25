'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Package, Plus, Search, Pencil, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import AppLayout from '@/components/AppLayout'
import DataTable, { Column } from '@/components/DataTable'
import DeleteModal from '@/components/DeleteModal'

type Supplier = {
  name: string
}

type Ingredient = {
  id: string
  name: string
  specification: string | null
  unit: string | null
  purchase_price: number | null
  unit_cost: number | null
  cost_unit: string | null
  supplier_id: string | null
  supplier: Supplier | null
}

export default function IngredientsPage() {
  const router = useRouter()
  const supabase = createClient()

  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSupplier, setSelectedSupplier] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Ingredient | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    fetchIngredients()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function fetchIngredients() {
    try {
      setLoading(true)
      setError(null)

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

      if (!profile?.org_id) {
        setError('組織情報が見つかりません')
        return
      }

      const { data, error: fetchError } = await supabase
        .from('ingredients')
        .select('*, supplier:suppliers(name)')
        .eq('org_id', profile.org_id)
        .order('name')

      if (fetchError) throw fetchError
      setIngredients((data as Ingredient[]) ?? [])
    } catch (err) {
      console.error(err)
      setError('食材データの取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const suppliers = useMemo(() => {
    const names = new Set<string>()
    ingredients.forEach((ing) => {
      if (ing.supplier?.name) names.add(ing.supplier.name)
    })
    return Array.from(names).sort()
  }, [ingredients])

  const filtered = useMemo(() => {
    return ingredients.filter((ing) => {
      const matchesSearch =
        !searchQuery || ing.name.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesSupplier =
        !selectedSupplier || ing.supplier?.name === selectedSupplier
      return matchesSearch && matchesSupplier
    })
  }, [ingredients, searchQuery, selectedSupplier])

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      setDeleting(true)
      const { error: deleteError } = await supabase
        .from('ingredients')
        .delete()
        .eq('id', deleteTarget.id)

      if (deleteError) throw deleteError
      setIngredients((prev) => prev.filter((i) => i.id !== deleteTarget.id))
      setDeleteTarget(null)
    } catch (err) {
      console.error(err)
      alert('削除に失敗しました')
    } finally {
      setDeleting(false)
    }
  }

  const formatPrice = (value: number | null) => {
    if (value == null) return '-'
    return `¥${value.toLocaleString('ja-JP')}`
  }

  const formatCostUnit = (unitCost: number | null, costUnit: string | null) => {
    if (unitCost == null) return '-'
    return `${unitCost.toLocaleString('ja-JP', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}円/${costUnit ?? 'g'}`
  }

  const columns: Column<Ingredient>[] = [
    { key: 'name', label: '食材名' },
    {
      key: 'supplier',
      label: '業者',
      render: (item) => item.supplier?.name ?? '-',
    },
    {
      key: 'specification',
      label: '規格',
      render: (item) => item.specification ?? '-',
    },
    {
      key: 'unit',
      label: '単位',
      render: (item) => item.unit ?? '-',
    },
    {
      key: 'purchase_price',
      label: '仕入単価',
      render: (item) => (
        <span className="font-medium">{formatPrice(item.purchase_price)}</span>
      ),
    },
    {
      key: 'unit_cost',
      label: '単位原価',
      render: (item) => (
        <span className="text-primary-600 font-medium">
          {formatCostUnit(item.unit_cost, item.cost_unit)}
        </span>
      ),
    },
    {
      key: 'actions',
      label: '',
      render: (item) => (
        <div className="flex items-center gap-2">
          <Link
            href={`/ingredients/${item.id}`}
            onClick={(e) => e.stopPropagation()}
            className="p-1.5 rounded-md text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
            title="編集"
          >
            <Pencil size={16} />
          </Link>
          <button
            onClick={(e) => {
              e.stopPropagation()
              setDeleteTarget(item)
            }}
            className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
            title="削除"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ),
    },
  ]

  return (
    <AppLayout
      title="食材マスタ"
      actions={
        <Link href="/ingredients/new" className="btn-primary inline-flex items-center gap-2">
          <Plus size={16} />
          食材を追加
        </Link>
      }
    >
      <div className="space-y-4">
        {/* Search and filters */}
        <div className="card">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                placeholder="食材名で検索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-field pl-9"
              />
            </div>
          </div>

          {/* Supplier filter tabs */}
          {suppliers.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              <button
                onClick={() => setSelectedSupplier(null)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  selectedSupplier === null
                    ? 'bg-primary-100 text-primary-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                すべて
              </button>
              {suppliers.map((name) => (
                <button
                  key={name}
                  onClick={() =>
                    setSelectedSupplier(selectedSupplier === name ? null : name)
                  }
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    selectedSupplier === name
                      ? 'bg-primary-100 text-primary-700'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Table */}
        <div className="card p-0 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
              <span className="ml-3 text-sm text-gray-500">読み込み中...</span>
            </div>
          ) : error ? (
            <div className="text-center py-16">
              <p className="text-sm text-red-600">{error}</p>
              <button
                onClick={fetchIngredients}
                className="btn-secondary mt-4"
              >
                再試行
              </button>
            </div>
          ) : (
            <>
              <DataTable
                columns={columns}
                data={filtered}
                onRowClick={(item) => router.push(`/ingredients/${item.id}`)}
                emptyMessage="食材が登録されていません。「食材を追加」から最初の食材を登録しましょう。"
              />
              {filtered.length > 0 && (
                <div className="px-4 py-3 border-t border-gray-100 bg-gray-50/50">
                  <p className="text-xs text-gray-500">
                    {filtered.length}件の食材を表示中
                    {searchQuery || selectedSupplier
                      ? `（全${ingredients.length}件中）`
                      : ''}
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <DeleteModal
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="食材の削除"
        message={`「${deleteTarget?.name}」を削除しますか？この食材を使用しているレシピにも影響します。`}
        isLoading={deleting}
      />
    </AppLayout>
  )
}
