'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type AuthMode = 'login' | 'signup'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()

  const [mode, setMode] = useState<AuthMode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [organizationName, setOrganizationName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError(
        error.message === 'Invalid login credentials'
          ? 'メールアドレスまたはパスワードが正しくありません'
          : error.message === 'Email not confirmed'
          ? 'メールアドレスが確認されていません。受信トレイをご確認ください'
          : 'ログインに失敗しました。しばらく経ってからお試しください。'
      )
      setLoading(false)
      return
    }

    window.location.href = '/dashboard'
  }

  const handleSignup = async () => {
    setLoading(true)
    setError(null)

    if (!fullName.trim()) {
      setError('氏名を入力してください')
      setLoading(false)
      return
    }

    if (!organizationName.trim()) {
      setError('組織名を入力してください')
      setLoading(false)
      return
    }

    if (password.length < 6) {
      setError('パスワードは6文字以上で入力してください')
      setLoading(false)
      return
    }

    // Create user + org + profile via server-side Admin API
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          full_name: fullName,
          org_name: organizationName,
        }),
      })

      if (!res.ok) {
        let errorMsg = '登録に失敗しました'
        try {
          const body = await res.json()
          errorMsg = body.error || errorMsg
        } catch {
          // レスポンスがJSONでない場合
        }
        throw new Error(errorMsg)
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : '登録中にエラーが発生しました。しばらく経ってからお試しください。'
      )
      setLoading(false)
      return
    }

    // User created & confirmed — now sign in
    const { error: loginError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (loginError) {
      setError('アカウントは作成されました。ログインタブからログインしてください。')
      setMode('login')
      setLoading(false)
      return
    }

    window.location.href = '/dashboard'
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (mode === 'login') {
      await handleLogin()
    } else {
      await handleSignup()
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-600 via-primary-700 to-primary-900 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-white/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-accent-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-white/[0.02] rounded-full" />
      </div>

      <div className="relative z-10 w-full max-w-md mx-4">
        {/* Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-2xl shadow-lg mb-4">
            <svg
              className="w-9 h-9 text-primary-600"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">
            RecipeCost
          </h1>
          <p className="text-primary-200 mt-1 text-sm">
            飲食店向け原価管理SaaS
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {/* Tab toggle */}
          <div className="flex bg-gray-100 rounded-lg p-1 mb-6">
            <button
              type="button"
              onClick={() => {
                setMode('login')
                setError(null)
              }}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                mode === 'login'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              ログイン
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('signup')
                setError(null)
              }}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                mode === 'signup'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              新規登録
            </button>
          </div>

          {/* Error message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <>
                <div>
                  <label htmlFor="fullName" className="label">
                    氏名
                  </label>
                  <input
                    id="fullName"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="input-field"
                    placeholder="山田 太郎"
                    required
                    disabled={loading}
                  />
                </div>
                <div>
                  <label htmlFor="orgName" className="label">
                    組織名（店舗名・会社名）
                  </label>
                  <input
                    id="orgName"
                    type="text"
                    value={organizationName}
                    onChange={(e) => setOrganizationName(e.target.value)}
                    className="input-field"
                    placeholder="焼肉レストラン田中"
                    required
                    disabled={loading}
                  />
                </div>
              </>
            )}

            <div>
              <label htmlFor="email" className="label">
                メールアドレス
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                placeholder="you@example.com"
                required
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="password" className="label">
                パスワード
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field"
                placeholder={
                  mode === 'signup' ? '6文字以上で入力' : '••••••••'
                }
                required
                minLength={mode === 'signup' ? 6 : undefined}
                disabled={loading}
              />
              {mode === 'login' && (
                <div className="mt-1 text-right">
                  <a
                    href="/reset-password"
                    className="text-sm text-primary-600 hover:text-primary-700 hover:underline"
                  >
                    パスワードをお忘れですか？
                  </a>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary py-3 text-base font-semibold flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg
                    className="animate-spin h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  処理中...
                </>
              ) : mode === 'login' ? (
                'ログイン'
              ) : (
                'アカウント作成'
              )}
            </button>
          </form>

          {/* Footer text */}
          <p className="mt-6 text-center text-xs text-gray-400">
            {mode === 'login'
              ? 'アカウントをお持ちでない方は「新規登録」タブへ'
              : '既にアカウントをお持ちの方は「ログイン」タブへ'}
          </p>
        </div>

        {/* Bottom link */}
        <p className="text-center mt-6 text-primary-200 text-xs">
          &copy; 2026 RecipeCost. All rights reserved.
        </p>
      </div>
    </div>
  )
}
