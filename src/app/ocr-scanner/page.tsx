'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Camera, Upload, Check, ArrowLeft, Plus, Trash2, ScanLine } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import AppLayout from '@/components/AppLayout'

type OcrItem = {
  name: string
  qty: number | string
  unit: string
  unitPrice: number | string
  amount: number
}

const DEMO_ITEMS: OcrItem[] = [
  { name: '仙台牛ブリスケ', qty: 5000, unit: 'g', unitPrice: 4.8, amount: 24000 },
  { name: '国産牛ハラミ', qty: 3000, unit: 'g', unitPrice: 6.8, amount: 20400 },
  { name: '仙台牛シンタマ', qty: 2000, unit: 'g', unitPrice: 5.6, amount: 11200 },
  { name: '国産牛ゲンコツカット', qty: 5000, unit: 'g', unitPrice: 0.23, amount: 1150 },
  { name: '国産鶏ガラ', qty: 3000, unit: 'g', unitPrice: 0.3, amount: 900 },
  { name: '仙台牛スネ', qty: 2000, unit: 'g', unitPrice: 1.85, amount: 3700 },
]

const STATUS_MESSAGES = [
  { at: 0, text: '画像を解析しています...' },
  { at: 25, text: 'テキストを認識しています...' },
  { at: 55, text: 'データを構造化しています...' },
  { at: 85, text: '検証しています...' },
  { at: 95, text: '完了しました！' },
]

const STEP_LABELS = ['撮影・選択', '読み取り中', '確認・編集', '完了']

export default function OcrScannerPage() {
  const router = useRouter()
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [currentStep, setCurrentStep] = useState(1)
  const [items, setItems] = useState<OcrItem[]>([])
  const [progress, setProgress] = useState(0)
  const [statusText, setStatusText] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const [registering, setRegistering] = useState(false)
  const [registeredCount, setRegisteredCount] = useState(0)
  const [registeredTotal, setRegisteredTotal] = useState(0)

  // Compute summary
  const itemCount = items.filter((item) => String(item.name).trim() !== '').length
  const totalAmount = items.reduce((sum, item) => {
    const q = Number(item.qty) || 0
    const p = Number(item.unitPrice) || 0
    return sum + q * p
  }, 0)

  // Progress simulation for step 2
  useEffect(() => {
    if (currentStep !== 2) return

    setProgress(0)
    setStatusText(STATUS_MESSAGES[0].text)

    const interval = setInterval(() => {
      setProgress((prev) => {
        const next = Math.min(prev + 2 + Math.random() * 3, 100)

        // Update status text
        for (let i = STATUS_MESSAGES.length - 1; i >= 0; i--) {
          if (next >= STATUS_MESSAGES[i].at) {
            setStatusText(STATUS_MESSAGES[i].text)
            break
          }
        }

        if (next >= 100) {
          clearInterval(interval)
          setTimeout(() => {
            setItems(DEMO_ITEMS.map((item) => ({ ...item })))
            setCurrentStep(3)
          }, 500)
        }

        return next
      })
    }, 80)

    return () => clearInterval(interval)
  }, [currentStep])

  const handleFileSelect = useCallback(() => {
    const input = fileInputRef.current
    if (input?.files && input.files.length > 0) {
      setCurrentStep(2)
    }
  }, [])

  const triggerFileInput = useCallback((mode: 'file' | 'camera') => {
    const input = fileInputRef.current
    if (!input) return
    if (mode === 'camera') {
      input.setAttribute('capture', 'environment')
    } else {
      input.removeAttribute('capture')
    }
    input.click()
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setCurrentStep(2)
    }
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const updateItem = useCallback((index: number, field: keyof OcrItem, value: string) => {
    setItems((prev) => {
      const updated = [...prev]
      const item = { ...updated[index] }

      if (field === 'name' || field === 'unit') {
        ;(item as Record<string, unknown>)[field] = value
      } else if (field === 'qty' || field === 'unitPrice') {
        ;(item as Record<string, unknown>)[field] = value
        const q = Number(field === 'qty' ? value : item.qty) || 0
        const p = Number(field === 'unitPrice' ? value : item.unitPrice) || 0
        item.amount = Math.round(q * p)
      }

      updated[index] = item
      return updated
    })
  }, [])

  const addRow = useCallback(() => {
    setItems((prev) => [...prev, { name: '', qty: '', unit: 'g', unitPrice: '', amount: 0 }])
  }, [])

  const removeRow = useCallback((index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const resetOCR = useCallback(() => {
    setCurrentStep(1)
    setItems([])
    setProgress(0)
    setStatusText('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [])

  const registerToIngredients = useCallback(async () => {
    try {
      setRegistering(true)

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
        alert('組織情報が見つかりません')
        return
      }

      const validItems = items.filter((item) => String(item.name).trim() !== '')
      const payloads = validItems.map((item) => ({
        name: String(item.name).trim(),
        unit: item.unit || null,
        purchase_price: Number(item.amount) || null,
        unit_cost: Number(item.unitPrice) || null,
        cost_unit: item.unit || 'g',
        org_id: profile.org_id,
      }))

      if (payloads.length === 0) {
        alert('登録する品目がありません')
        return
      }

      const { error } = await supabase.from('ingredients').insert(payloads)
      if (error) throw error

      const total = validItems.reduce((sum, item) => {
        return sum + (Number(item.qty) || 0) * (Number(item.unitPrice) || 0)
      }, 0)

      setRegisteredCount(validItems.length)
      setRegisteredTotal(Math.round(total))
      setCurrentStep(4)
    } catch (err) {
      console.error(err)
      alert('登録に失敗しました')
    } finally {
      setRegistering(false)
    }
  }, [items, supabase, router])

  return (
    <AppLayout title="納品書スキャン">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-0">
          {STEP_LABELS.map((label, i) => {
            const stepNum = i + 1
            const isActive = stepNum === currentStep
            const isDone = stepNum < currentStep
            return (
              <div key={stepNum} className="flex items-center">
                {i > 0 && (
                  <div
                    className={`w-8 sm:w-12 h-0.5 ${
                      isDone ? 'bg-primary-500' : 'bg-gray-200'
                    }`}
                  />
                )}
                <div className="flex flex-col items-center gap-1">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                      isDone
                        ? 'bg-primary-500 text-white'
                        : isActive
                          ? 'bg-primary-500 text-white ring-4 ring-primary-100'
                          : 'bg-gray-200 text-gray-500'
                    }`}
                  >
                    {isDone ? <Check size={16} /> : stepNum}
                  </div>
                  <span
                    className={`text-xs whitespace-nowrap ${
                      isActive ? 'text-primary-600 font-medium' : 'text-gray-400'
                    }`}
                  >
                    {label}
                  </span>
                </div>
              </div>
            )
          })}
        </div>

        {/* Step 1: Upload / Capture */}
        {currentStep === 1 && (
          <div className="card">
            <div className="p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-1">納品書を読み取る</h3>
              <p className="text-sm text-gray-500 mb-6">
                納品書の写真を撮影するか、画像ファイルを選択してください。
                <br />
                AIが自動で食材名・数量・金額を読み取ります。
              </p>

              {/* Drop zone */}
              <div
                onClick={() => triggerFileInput('file')}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
                  isDragging
                    ? 'border-primary-400 bg-primary-50'
                    : 'border-gray-300 hover:border-primary-300 hover:bg-gray-50'
                }`}
              >
                <Upload size={40} className="mx-auto text-gray-400 mb-3" />
                <p className="text-gray-700 font-medium">
                  タップして画像を選択
                </p>
                <p className="text-sm text-gray-400 mt-1">
                  JPG, PNG対応 / 最大10MB
                </p>
                <p className="text-xs text-gray-400 mt-2">
                  ドラッグ＆ドロップも可能
                </p>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png"
                className="hidden"
                onChange={handleFileSelect}
              />

              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => triggerFileInput('camera')}
                  className="btn-secondary w-full inline-flex items-center justify-center gap-2"
                >
                  <Camera size={18} />
                  カメラで撮影
                </button>
              </div>

              <div className="text-center mt-6 pt-5 border-t border-gray-200">
                <p className="text-sm text-gray-500 mb-3">カメラや画像がない場合</p>
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-white font-medium text-sm transition-all"
                  style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  }}
                >
                  <ScanLine size={18} />
                  デモデータで試す
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Processing */}
        {currentStep === 2 && (
          <div className="card">
            <div className="p-6 text-center py-12">
              <div className="relative inline-block mb-4">
                <ScanLine size={48} className="text-primary-500 animate-pulse" />
              </div>

              <h3 className="text-lg font-bold text-gray-900 mb-2">読み取り中...</h3>
              <p className="text-sm text-gray-500">{statusText}</p>

              <div className="mt-6 bg-gray-200 rounded-full h-2.5 max-w-xs mx-auto overflow-hidden">
                <div
                  className="bg-primary-500 h-2.5 rounded-full transition-all duration-100"
                  style={{ width: `${Math.round(progress)}%` }}
                />
              </div>
              <p className="text-sm text-gray-400 mt-2">{Math.round(progress)}%</p>
            </div>
          </div>
        )}

        {/* Step 3: Review & Edit */}
        {currentStep === 3 && (
          <div className="card">
            <div className="p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-bold text-gray-900">読み取り結果</h3>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                  <Check size={12} />
                  AI読み取り完了
                </span>
              </div>
              <p className="text-sm text-gray-500 mb-4">
                内容を確認・修正して「食材マスタに登録する」を押してください。
              </p>

              {/* Items table */}
              <div className="overflow-x-auto -mx-6 px-6">
                <table className="w-full text-sm min-w-[520px]">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 pr-2 font-medium text-gray-600">品名</th>
                      <th className="text-right py-2 px-2 font-medium text-gray-600">数量</th>
                      <th className="text-left py-2 px-2 font-medium text-gray-600">単位</th>
                      <th className="text-right py-2 px-2 font-medium text-gray-600">単価</th>
                      <th className="text-right py-2 px-2 font-medium text-gray-600">金額</th>
                      <th className="w-8 py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, idx) => (
                      <tr key={idx} className="border-b border-gray-100">
                        <td className="py-1.5 pr-2">
                          <input
                            type="text"
                            value={item.name}
                            onChange={(e) => updateItem(idx, 'name', e.target.value)}
                            className="input-field text-sm py-1.5 w-full min-w-[120px]"
                          />
                        </td>
                        <td className="py-1.5 px-2">
                          <input
                            type="number"
                            value={item.qty}
                            onChange={(e) => updateItem(idx, 'qty', e.target.value)}
                            className="input-field text-sm py-1.5 text-right w-20"
                          />
                        </td>
                        <td className="py-1.5 px-2">
                          <input
                            type="text"
                            value={item.unit}
                            onChange={(e) => updateItem(idx, 'unit', e.target.value)}
                            className="input-field text-sm py-1.5 w-14"
                          />
                        </td>
                        <td className="py-1.5 px-2">
                          <input
                            type="number"
                            step="0.01"
                            value={item.unitPrice}
                            onChange={(e) => updateItem(idx, 'unitPrice', e.target.value)}
                            className="input-field text-sm py-1.5 text-right w-20"
                          />
                        </td>
                        <td className="py-1.5 px-2 text-right font-medium text-gray-900 whitespace-nowrap">
                          {item.amount.toLocaleString()} 円
                        </td>
                        <td className="py-1.5 pl-1">
                          <button
                            type="button"
                            onClick={() => removeRow(idx)}
                            className="p-1 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            title="削除"
                          >
                            <Trash2 size={15} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <button
                type="button"
                onClick={addRow}
                className="btn-secondary text-sm inline-flex items-center gap-1 mt-3"
              >
                <Plus size={14} />
                行を追加
              </button>

              {/* Summary */}
              <div className="mt-5 bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>品目数</span>
                  <span>{itemCount}件</span>
                </div>
                <div className="flex justify-between text-base font-bold text-gray-900 pt-2 border-t border-gray-200">
                  <span>合計金額</span>
                  <span>{Math.round(totalAmount).toLocaleString()} 円</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={resetOCR}
                  className="btn-secondary inline-flex items-center gap-2"
                >
                  <ArrowLeft size={16} />
                  やり直す
                </button>
                <button
                  type="button"
                  onClick={registerToIngredients}
                  disabled={registering || itemCount === 0}
                  className="btn-primary flex-1 inline-flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {registering ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                      登録中...
                    </>
                  ) : (
                    <>
                      <Check size={16} />
                      食材マスタに登録する
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Complete */}
        {currentStep === 4 && (
          <div className="card">
            <div className="p-6 text-center py-12">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check size={32} className="text-green-600" />
              </div>

              <h3 className="text-lg font-bold text-gray-900 mb-2">登録が完了しました！</h3>
              <p className="text-sm text-gray-500 mb-6">
                納品書データが食材マスタに反映されました。
              </p>

              <div className="bg-gray-50 rounded-lg p-4 space-y-2 max-w-xs mx-auto mb-8">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>登録品目数</span>
                  <span>{registeredCount} 件</span>
                </div>
                <div className="flex justify-between text-base font-bold text-gray-900 pt-2 border-t border-gray-200">
                  <span>合計金額</span>
                  <span>¥{registeredTotal.toLocaleString()}</span>
                </div>
              </div>

              <div className="flex gap-3 justify-center">
                <button
                  type="button"
                  onClick={resetOCR}
                  className="btn-secondary inline-flex items-center gap-2"
                >
                  <ScanLine size={16} />
                  続けてスキャン
                </button>
                <Link
                  href="/ingredients"
                  className="btn-primary inline-flex items-center gap-2"
                >
                  食材マスタを確認
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
