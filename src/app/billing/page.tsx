'use client'

import { useState, useEffect } from 'react'
import { Check, CreditCard, Zap, Crown, ArrowRight, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Organization, Profile } from '@/types/database'

type PlanId = 'free' | 'starter' | 'pro'

type PlanInfo = {
  id: PlanId
  name: string
  nameJa: string
  price: number
  priceLabel: string
  icon: typeof CreditCard
  features: string[]
  limits: {
    ingredients: number | null // null = unlimited
    recipes: number | null
    users: number | null
  }
  highlight?: boolean
}

const PLANS: PlanInfo[] = [
  {
    id: 'free',
    name: 'Free',
    nameJa: '無料',
    price: 0,
    priceLabel: '¥0/月',
    icon: CreditCard,
    features: ['食材50件まで', 'レシピ10件まで', '1ユーザー', '基本レポート'],
    limits: { ingredients: 50, recipes: 10, users: 1 },
  },
  {
    id: 'starter',
    name: 'Starter',
    nameJa: 'スターター',
    price: 2980,
    priceLabel: '¥2,980/月',
    icon: Zap,
    features: [
      '食材200件まで',
      'レシピ50件まで',
      '3ユーザーまで',
      'AI原価相談',
      '月次分析レポート',
    ],
    limits: { ingredients: 200, recipes: 50, users: 3 },
    highlight: true,
  },
  {
    id: 'pro',
    name: 'Pro',
    nameJa: 'プロ',
    price: 9800,
    priceLabel: '¥9,800/月',
    icon: Crown,
    features: [
      '食材無制限',
      'レシピ無制限',
      '無制限ユーザー',
      'AI原価相談',
      'OCR読み取り',
      '優先サポート',
      '高度な分析機能',
    ],
    limits: { ingredients: null, recipes: null, users: null },
  },
]

export default function BillingPage() {
  const [currentPlan, setCurrentPlan] = useState<PlanId>('free')
  const [org, setOrg] = useState<Organization | null>(null)
  const [loading, setLoading] = useState(true)
  const [upgrading, setUpgrading] = useState<PlanId | null>(null)
  const [usage, setUsage] = useState({
    ingredients: 0,
    recipes: 0,
    users: 0,
  })

  useEffect(() => {
    const fetchData = async () => {
      try {
        const supabase = createClient()
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) return

        const { data: profile } = await supabase
          .from('profiles')
          .select('org_id')
          .eq('id', user.id)
          .single<Pick<Profile, 'org_id'>>()

        if (!profile?.org_id) return

        const [orgResult, ingredientCount, recipeCount, userCount] =
          await Promise.all([
            supabase
              .from('organizations')
              .select('*')
              .eq('id', profile.org_id)
              .single<Organization>(),
            supabase
              .from('ingredients')
              .select('id', { count: 'exact', head: true })
              .eq('org_id', profile.org_id),
            supabase
              .from('recipes')
              .select('id', { count: 'exact', head: true })
              .eq('org_id', profile.org_id),
            supabase
              .from('profiles')
              .select('id', { count: 'exact', head: true })
              .eq('org_id', profile.org_id)
              .eq('is_active', true),
          ])

        if (orgResult.data) {
          setOrg(orgResult.data)
          setCurrentPlan(orgResult.data.plan as PlanId)
        }

        setUsage({
          ingredients: ingredientCount.count ?? 0,
          recipes: recipeCount.count ?? 0,
          users: userCount.count ?? 0,
        })
      } catch (error) {
        console.error('Failed to fetch billing data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const handlePlanChange = async (planId: PlanId) => {
    if (planId === currentPlan || upgrading) return

    setUpgrading(planId)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId }),
      })

      if (!res.ok) {
        throw new Error('Checkout session creation failed')
      }

      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      }
    } catch (error) {
      console.error('Plan change error:', error)
      alert('プランの変更に失敗しました。もう一度お試しください。')
    } finally {
      setUpgrading(null)
    }
  }

  const getButtonLabel = (planId: PlanId): string => {
    if (planId === currentPlan) return '現在のプラン'
    const planIndex = PLANS.findIndex((p) => p.id === planId)
    const currentIndex = PLANS.findIndex((p) => p.id === currentPlan)
    return planIndex > currentIndex ? 'アップグレード' : 'ダウングレード'
  }

  const getUsagePercent = (
    current: number,
    limit: number | null
  ): number => {
    if (limit === null) return 0
    return Math.min(Math.round((current / limit) * 100), 100)
  }

  const currentPlanInfo = PLANS.find((p) => p.id === currentPlan)
  const planLimits = currentPlanInfo?.limits

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 size={32} className="animate-spin text-primary-600" />
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">料金プラン</h1>
        <p className="mt-1 text-sm text-gray-500">
          現在のプランと使用状況を確認し、必要に応じてプランを変更できます
        </p>
      </div>

      {/* Current Plan Badge */}
      <div className="mb-8 flex items-center gap-3 p-4 rounded-xl bg-primary-50 border border-primary-200">
        <div className="w-10 h-10 rounded-lg bg-primary-600 flex items-center justify-center">
          {currentPlanInfo && <currentPlanInfo.icon size={20} className="text-white" />}
        </div>
        <div>
          <p className="text-sm text-primary-600 font-medium">現在のプラン</p>
          <p className="text-lg font-bold text-primary-900">
            {currentPlanInfo?.name}（{currentPlanInfo?.nameJa}）
          </p>
        </div>
        {org?.stripe_subscription_id && (
          <span className="ml-auto text-xs bg-green-100 text-green-700 font-medium px-2.5 py-1 rounded-full">
            有効
          </span>
        )}
      </div>

      {/* Usage Stats */}
      <div className="mb-10">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          使用状況
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {
              label: '食材',
              current: usage.ingredients,
              limit: planLimits?.ingredients ?? null,
            },
            {
              label: 'レシピ',
              current: usage.recipes,
              limit: planLimits?.recipes ?? null,
            },
            {
              label: 'ユーザー',
              current: usage.users,
              limit: planLimits?.users ?? null,
            },
          ].map((stat) => {
            const percent = getUsagePercent(stat.current, stat.limit)
            const isNearLimit = percent >= 80
            return (
              <div
                key={stat.label}
                className="bg-white rounded-xl border border-gray-200 p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">
                    {stat.label}
                  </span>
                  <span className="text-sm text-gray-500">
                    {stat.current} / {stat.limit ?? '無制限'}
                  </span>
                </div>
                {stat.limit !== null ? (
                  <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        isNearLimit ? 'bg-orange-500' : 'bg-primary-500'
                      }`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                ) : (
                  <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full w-full bg-green-400 rounded-full" />
                  </div>
                )}
                {isNearLimit && (
                  <p className="text-xs text-orange-600 mt-1.5">
                    上限に近づいています
                  </p>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Plan Cards */}
      <div className="mb-10">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          プラン一覧
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PLANS.map((plan) => {
            const isCurrent = plan.id === currentPlan
            const Icon = plan.icon
            return (
              <div
                key={plan.id}
                className={`relative rounded-2xl border-2 p-6 flex flex-col transition-shadow ${
                  isCurrent
                    ? 'border-primary-500 bg-primary-50/50 shadow-lg shadow-primary-100'
                    : plan.highlight
                      ? 'border-primary-200 bg-white hover:shadow-md'
                      : 'border-gray-200 bg-white hover:shadow-md'
                }`}
              >
                {plan.highlight && !isCurrent && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-primary-600 text-white text-xs font-semibold px-3 py-1 rounded-full">
                      おすすめ
                    </span>
                  </div>
                )}
                {isCurrent && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-green-600 text-white text-xs font-semibold px-3 py-1 rounded-full">
                      現在のプラン
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-3 mb-4">
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      isCurrent
                        ? 'bg-primary-600'
                        : 'bg-gray-100'
                    }`}
                  >
                    <Icon
                      size={20}
                      className={isCurrent ? 'text-white' : 'text-gray-600'}
                    />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {plan.name}
                    </h3>
                    <p className="text-xs text-gray-500">{plan.nameJa}</p>
                  </div>
                </div>

                <div className="mb-5">
                  <span className="text-3xl font-bold text-gray-900">
                    {plan.price === 0
                      ? '¥0'
                      : `¥${plan.price.toLocaleString()}`}
                  </span>
                  <span className="text-sm text-gray-500 ml-1">/月</span>
                </div>

                <ul className="space-y-2.5 mb-6 flex-1">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <Check
                        size={16}
                        className={`mt-0.5 flex-shrink-0 ${
                          isCurrent ? 'text-primary-600' : 'text-green-500'
                        }`}
                      />
                      <span className="text-sm text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handlePlanChange(plan.id)}
                  disabled={isCurrent || upgrading !== null}
                  className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    isCurrent
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : plan.highlight
                        ? 'bg-primary-600 text-white hover:bg-primary-700'
                        : 'bg-gray-900 text-white hover:bg-gray-800'
                  } disabled:opacity-50`}
                >
                  {upgrading === plan.id ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <>
                      {getButtonLabel(plan.id)}
                      {!isCurrent && <ArrowRight size={14} />}
                    </>
                  )}
                </button>
              </div>
            )
          })}
        </div>
      </div>

      {/* Billing History Placeholder */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          請求履歴
        </h2>
        <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
          <table className="w-full text-sm min-w-[480px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-medium text-gray-600">
                  日付
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">
                  内容
                </th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">
                  金額
                </th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">
                  状態
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td
                  colSpan={4}
                  className="px-4 py-12 text-center text-gray-400"
                >
                  請求履歴はまだありません
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
