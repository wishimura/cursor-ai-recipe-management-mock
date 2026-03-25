'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { MessageSquare, X, Send, Bot, User } from 'lucide-react'

type Message = {
  role: 'user' | 'assistant'
  content: string
}

const QUICK_PROMPTS = [
  '原価率の高いメニューは？',
  '原価率を改善するには？',
  '今月の原価分析',
]

export default function ChatAssistant() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, isLoading, scrollToBottom])

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return

    const userMessage: Message = { role: 'user', content: content.trim() }
    const updatedMessages = [...messages, userMessage]
    setMessages(updatedMessages)
    setInput('')
    setIsLoading(true)

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: content.trim(),
          history: messages,
        }),
      })

      if (!res.ok) {
        throw new Error(`API error: ${res.status}`)
      }

      const data = await res.json()
      const assistantMessage: Message = {
        role: 'assistant',
        content: data.response,
      }
      setMessages([...updatedMessages, assistantMessage])
    } catch (error) {
      const errorMessage: Message = {
        role: 'assistant',
        content:
          '申し訳ございません。エラーが発生しました。しばらくしてから再度お試しください。',
      }
      setMessages([...updatedMessages, errorMessage])
      console.error('Chat error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    sendMessage(input)
  }

  const handleQuickPrompt = (prompt: string) => {
    sendMessage(prompt)
  }

  return (
    <>
      {/* FAB Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full bg-primary-600 px-5 py-3.5
                     text-white shadow-lg hover:bg-primary-700 transition-all duration-200
                     hover:shadow-xl hover:scale-105 active:scale-95"
          aria-label="AIコスト相談を開く"
        >
          <MessageSquare size={20} />
          <span className="text-sm font-medium hidden sm:inline">AIコスト相談</span>
        </button>
      )}

      {/* Chat Panel */}
      {isOpen && (
        <div
          className="fixed z-50 flex flex-col bg-white shadow-2xl border border-gray-200
                     inset-0 sm:inset-auto sm:bottom-6 sm:right-6 sm:w-[400px] sm:h-[500px]
                     sm:rounded-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-primary-600 to-primary-700 text-white flex-shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <Bot size={18} />
              </div>
              <div>
                <h3 className="text-sm font-semibold">AI原価アシスタント</h3>
                <p className="text-xs text-primary-100">原価管理のご相談はこちら</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-lg hover:bg-white/20 transition-colors"
              aria-label="チャットを閉じる"
            >
              <X size={18} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-gray-50">
            {messages.length === 0 && (
              <div className="text-center py-6">
                <div className="w-14 h-14 rounded-full bg-primary-100 flex items-center justify-center mx-auto mb-3">
                  <Bot size={28} className="text-primary-600" />
                </div>
                <p className="text-sm text-gray-700 font-medium mb-1">
                  こんにちは！
                </p>
                <p className="text-xs text-gray-500 mb-5">
                  原価に関するご質問にお答えします
                </p>
                <div className="space-y-2">
                  {QUICK_PROMPTS.map((prompt) => (
                    <button
                      key={prompt}
                      onClick={() => handleQuickPrompt(prompt)}
                      className="block w-full text-left px-3.5 py-2.5 rounded-xl border border-gray-200
                                 bg-white text-sm text-gray-700 hover:border-primary-300
                                 hover:bg-primary-50 transition-colors"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'assistant' && (
                  <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary-100 flex items-center justify-center mt-0.5">
                    <Bot size={14} className="text-primary-600" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                    msg.role === 'user'
                      ? 'bg-primary-600 text-white rounded-br-md'
                      : 'bg-white text-gray-800 border border-gray-200 rounded-bl-md shadow-sm'
                  }`}
                >
                  {msg.content}
                </div>
                {msg.role === 'user' && (
                  <div className="flex-shrink-0 w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center mt-0.5">
                    <User size={14} className="text-gray-600" />
                  </div>
                )}
              </div>
            ))}

            {/* Typing Indicator */}
            {isLoading && (
              <div className="flex gap-2.5 justify-start">
                <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary-100 flex items-center justify-center mt-0.5">
                  <Bot size={14} className="text-primary-600" />
                </div>
                <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0ms]" />
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:150ms]" />
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:300ms]" />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts (when conversation started) */}
          {messages.length > 0 && !isLoading && (
            <div className="flex gap-1.5 px-4 py-2 overflow-x-auto bg-white border-t border-gray-100 flex-shrink-0">
              {QUICK_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => handleQuickPrompt(prompt)}
                  className="flex-shrink-0 px-3 py-1.5 rounded-full border border-gray-200
                             text-xs text-gray-600 hover:border-primary-300 hover:bg-primary-50
                             transition-colors"
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <form
            onSubmit={handleSubmit}
            className="flex items-center gap-2 px-4 py-3 border-t border-gray-200 bg-white flex-shrink-0"
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="メッセージを入力..."
              disabled={isLoading}
              className="flex-1 rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm
                         placeholder:text-gray-400 focus:outline-none focus:ring-2
                         focus:ring-primary-500 focus:border-transparent
                         disabled:bg-gray-50 disabled:cursor-not-allowed"
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="flex-shrink-0 p-2.5 rounded-xl bg-primary-600 text-white
                         hover:bg-primary-700 transition-colors
                         disabled:bg-gray-300 disabled:cursor-not-allowed"
              aria-label="送信"
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      )}
    </>
  )
}
