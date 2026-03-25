import Link from 'next/link'
import {
  Calculator,
  ClipboardList,
  Sparkles,
  Building2,
  ArrowRight,
  Check,
} from 'lucide-react'

const features = [
  {
    icon: Calculator,
    title: 'レシピ原価計算',
    description: 'メニューごとの原価率を自動算出。食材の単価変動もリアルタイムに反映します。',
  },
  {
    icon: ClipboardList,
    title: '棚卸管理',
    description: '月次棚卸と原価推移をトラッキング。ロスの発生を早期に発見できます。',
  },
  {
    icon: Sparkles,
    title: 'AI原価シミュレーション',
    description: 'Claude AIが食材の代替案や仕入れ先の最適化を提案。原価改善をサポートします。',
  },
  {
    icon: Building2,
    title: 'マルチ店舗対応',
    description: '複数店舗の原価を一元管理。店舗ごとの比較分析もワンクリックで実行できます。',
  },
]

const plans = [
  {
    name: 'Free',
    price: '0',
    description: 'まずは試してみたい方に',
    features: [
      'レシピ登録 10件まで',
      '食材登録 50件まで',
      '基本原価計算',
      '1ユーザー',
    ],
    cta: '無料で始める',
    highlighted: false,
  },
  {
    name: 'Starter',
    price: '4,980',
    description: '個人店・小規模チェーン向け',
    features: [
      'レシピ登録 無制限',
      '食材登録 無制限',
      '棚卸管理',
      'AI原価シミュレーション',
      '5ユーザーまで',
      'メールサポート',
    ],
    cta: '14日間無料トライアル',
    highlighted: true,
  },
  {
    name: 'Pro',
    price: '14,800',
    description: '複数店舗を運営する企業向け',
    features: [
      'Starterの全機能',
      'マルチ店舗管理',
      'API連携',
      '高度な分析レポート',
      'ユーザー無制限',
      '専任サポート',
    ],
    cta: 'お問い合わせ',
    highlighted: false,
  },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <Calculator className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-bold text-gray-900">RecipeCost</span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm text-gray-600 hover:text-gray-900 transition-colors font-medium px-3 py-2"
            >
              ログイン
            </Link>
            <Link
              href="/login"
              className="btn-primary text-sm"
            >
              無料で始める
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-50 via-white to-accent-50 pointer-events-none" />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-24 sm:pt-28 sm:pb-32">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-primary-50 text-primary-700 text-sm font-medium px-4 py-1.5 rounded-full mb-6 border border-primary-100">
              <Sparkles className="w-4 h-4" />
              Claude AI搭載の次世代原価管理
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 tracking-tight leading-tight">
              飲食店の原価を、
              <br />
              <span className="text-primary-600">見える化する</span>
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-gray-600 leading-relaxed max-w-2xl mx-auto">
              レシピの原価計算から棚卸管理、AIによる原価改善提案まで。
              <br className="hidden sm:block" />
              飲食店の利益最大化をワンストップで支援します。
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/login"
                className="btn-primary px-8 py-3.5 text-base font-semibold inline-flex items-center gap-2 shadow-lg shadow-primary-600/25"
              >
                無料で始める
                <ArrowRight className="w-4 h-4" />
              </Link>
              <a
                href="#features"
                className="btn-secondary px-8 py-3.5 text-base"
              >
                機能を見る
              </a>
            </div>
            <p className="mt-4 text-sm text-gray-400">
              クレジットカード不要 ・ 最短30秒で登録完了
            </p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 sm:py-28 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
              原価管理に必要な全てを、ひとつに
            </h2>
            <p className="mt-4 text-gray-600 text-lg max-w-2xl mx-auto">
              複雑な原価管理をシンプルに。直感的な操作で、誰でもすぐに使い始められます。
            </p>
          </div>
          <div className="grid sm:grid-cols-2 gap-6 lg:gap-8">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="bg-white rounded-2xl p-6 lg:p-8 border border-gray-200 hover:border-primary-200 hover:shadow-lg transition-all duration-200 group"
              >
                <div className="w-12 h-12 bg-primary-100 text-primary-600 rounded-xl flex items-center justify-center mb-4 group-hover:bg-primary-600 group-hover:text-white transition-colors">
                  <feature.icon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600 leading-relaxed text-sm">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 sm:py-28">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
              シンプルな料金プラン
            </h2>
            <p className="mt-4 text-gray-600 text-lg">
              お店の規模に合わせて選べる3つのプラン
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6 lg:gap-8 max-w-5xl mx-auto">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`rounded-2xl p-6 lg:p-8 border-2 relative flex flex-col ${
                  plan.highlighted
                    ? 'border-primary-600 bg-white shadow-xl shadow-primary-600/10'
                    : 'border-gray-200 bg-white'
                }`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary-600 text-white text-xs font-semibold px-4 py-1 rounded-full">
                    おすすめ
                  </div>
                )}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {plan.name}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {plan.description}
                  </p>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-gray-900">
                      &yen;{plan.price}
                    </span>
                    <span className="text-gray-500 text-sm">/月</span>
                  </div>
                </div>
                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-primary-600 mt-0.5 shrink-0" />
                      <span className="text-sm text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/login"
                  className={`w-full py-3 text-sm font-semibold rounded-lg text-center block transition-colors ${
                    plan.highlighted
                      ? 'bg-primary-600 text-white hover:bg-primary-700'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 sm:py-24 bg-gradient-to-br from-primary-600 to-primary-800">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white">
            原価管理を、もっとシンプルに
          </h2>
          <p className="mt-4 text-primary-100 text-lg">
            まずは無料プランで、RecipeCostの使いやすさを体験してください。
          </p>
          <Link
            href="/login"
            className="mt-8 inline-flex items-center gap-2 bg-white text-primary-700 font-semibold px-8 py-3.5 rounded-lg hover:bg-primary-50 transition-colors shadow-lg"
          >
            今すぐ無料で始める
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-primary-600 rounded-lg flex items-center justify-center">
                <Calculator className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="font-semibold text-gray-900 text-sm">
                RecipeCost
              </span>
            </div>
            <p className="text-sm text-gray-400">
              &copy; 2026 RecipeCost. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
