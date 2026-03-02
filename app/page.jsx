'use client'

import { useState } from 'react'
import InputForm from '@/components/InputForm'
import ResultsView from '@/components/ResultsView'

export default function Home() {
  const [phase, setPhase] = useState('input') // 'input' | 'loading' | 'results'
  const [results, setResults] = useState(null)
  const [error, setError] = useState(null)
  const [lastScore, setLastScore] = useState(null)
  const [lastFormData, setLastFormData] = useState(null)

  const handleSubmit = async (formData) => {
    setPhase('loading')
    setError(null)
    setLastScore(formData.score)
    setLastFormData(formData)

    try {
      const res = await fetch('/api/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.error || '请求失败，请重试')
      setResults(json.data)
      setPhase('results')
    } catch (err) {
      setError(err.message)
      setPhase('input')
    }
  }

  const handleReset = () => {
    setPhase('input')
    setResults(null)
    setError(null)
  }

  const handleRegenerate = () => {
    if (lastFormData) handleSubmit(lastFormData)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Nav */}
      <nav className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-xs font-bold">志</span>
            </div>
            <span className="font-bold text-gray-900">志愿参谋</span>
            <span className="text-xs bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded font-medium">Beta</span>
          </div>
          <span className="text-xs text-gray-400">AI驱动 · 全国通用</span>
        </div>
      </nav>

      <main className="max-w-lg mx-auto px-4 py-6">
        {phase === 'loading' && (
          <div className="flex flex-col items-center justify-center py-20 space-y-6">
            <div className="relative w-20 h-20">
              <div className="absolute inset-0 rounded-full border-4 border-blue-600 border-t-transparent animate-spin" />
              <div className="absolute inset-3 rounded-full bg-blue-100 flex items-center justify-center">
                <span className="text-blue-600 text-xl">🎓</span>
              </div>
            </div>
            <div className="text-center">
              <p className="font-semibold text-gray-800 text-lg">AI正在为你分析...</p>
              <p className="text-sm text-gray-400 mt-1">匹配最适合你的院校组合</p>
            </div>
          </div>
        )}

        {phase === 'input' && (
          <div className="space-y-6">
            <div className="text-center pt-2 pb-4">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                告诉我你的情况<br />
                <span className="text-blue-600">我来帮你选志愿</span>
              </h1>
              <p className="text-sm text-gray-400">像跟顾问聊天，3步完成个性化择校分析</p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
                <span className="text-red-500 shrink-0">⚠️</span>
                <div>
                  <p className="text-sm font-medium text-red-700">出错了</p>
                  <p className="text-xs text-red-500 mt-0.5">{error}</p>
                </div>
              </div>
            )}

            <InputForm onSubmit={handleSubmit} />
          </div>
        )}

        {phase === 'results' && results && (
          <ResultsView data={results} userScore={lastScore} onReset={handleReset} onRegenerate={handleRegenerate} />
        )}
      </main>

      <footer className="max-w-lg mx-auto px-4 py-8 text-center text-xs text-gray-300">
        数据来源：全国高校公开录取数据 · Powered by Claude AI
      </footer>
    </div>
  )
}
