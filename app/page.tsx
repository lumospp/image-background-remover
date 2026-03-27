'use client'

import { useState, useRef, useCallback } from 'react'

type AppState = 'idle' | 'uploading' | 'processing' | 'success' | 'error'

export default function HomePage() {
  const [state, setState] = useState<AppState>('idle')
  const [originalUrl, setOriginalUrl] = useState<string | null>(null)
  const [resultUrl, setResultUrl] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string>('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const processImage = useCallback(async (file: File) => {
    const preview = URL.createObjectURL(file)
    setOriginalUrl(preview)
    setResultUrl(null)
    setErrorMessage('')
    setState('uploading')

    try {
      setState('processing')

      const formData = new FormData()
      formData.append('image', file)

      const response = await fetch('/api/removebg', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        let errorText = '处理失败，请稍后重试'
        try {
          const data = await response.json()
          errorText = data.error || errorText
        } catch {}
        throw new Error(errorText)
      }

      const blob = await response.blob()

      if (blob.size === 0) {
        throw new Error('返回图片为空')
      }

      const result = URL.createObjectURL(blob)
      setResultUrl(result)
      setState('success')
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : '未知错误')
      setState('error')
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith('image/')) {
      processImage(file)
    }
  }, [processImage])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      processImage(file)
    }
  }, [processImage])

  const handleReset = useCallback(() => {
    if (originalUrl) URL.revokeObjectURL(originalUrl)
    if (resultUrl) URL.revokeObjectURL(resultUrl)
    setOriginalUrl(null)
    setResultUrl(null)
    setErrorMessage('')
    setState('idle')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [originalUrl, resultUrl])

  const handleDownload = useCallback(() => {
    if (!resultUrl) return
    const a = document.createElement('a')
    a.href = resultUrl
    a.download = 'removed-background.png'
    a.click()
  }, [resultUrl])

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 antialiased">
      {/* Header */}
      <header className="bg-white border-b border-slate-100/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-2xl mx-auto px-6 py-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-md bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center flex-shrink-0">
                <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h1 className="text-sm font-medium text-slate-900">AI 智能抠图</h1>
            </div>
            <span className="text-xs text-slate-400">永久免费</span>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="px-6 py-8">
        <div className="max-w-2xl mx-auto">
          
          {/* Success State */}
          {state === 'success' && resultUrl && (
            <div className="animate-fade-in-up">
              {/* Result Header */}
              <div className="text-center mb-5">
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-emerald-50 mb-3">
                  <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-base font-medium text-slate-900">处理完成</h2>
                <p className="text-xs text-slate-500 mt-1">背景已去除，可直接下载</p>
              </div>
              
              {/* Image Comparison */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-white rounded-xl p-2.5 shadow-soft">
                  <p className="text-xs text-slate-400 mb-1.5">原图</p>
                  <div className="rounded-lg overflow-hidden border border-slate-100">
                    <img src={originalUrl!} alt="Original" className="w-full" />
                  </div>
                </div>
                <div className="bg-white rounded-xl p-2.5 shadow-soft">
                  <p className="text-xs text-slate-400 mb-1.5">抠图结果</p>
                  <div className="rounded-lg overflow-hidden border border-slate-100 checkerboard">
                    <img src={resultUrl!} alt="Result" className="w-full" />
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={handleDownload}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 bg-indigo-500 hover:bg-indigo-600 text-white py-2.5 px-4 rounded-xl font-medium transition-colors text-sm"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  下载图片
                </button>
                <button
                  onClick={handleReset}
                  className="px-4 py-2.5 bg-white border border-slate-200 hover:border-slate-300 rounded-xl font-medium transition-colors text-sm text-slate-600"
                >
                  处理下一张
                </button>
              </div>

              {/* Share hint */}
              <div className="mt-3 text-center">
                <p className="text-xs text-slate-400">PNG透明背景，可直接用于设计</p>
              </div>
            </div>
          )}

          {/* Error State */}
          {state === 'error' && (
            <div className="animate-fade-in-up">
              <div className="bg-white rounded-xl p-4 shadow-soft border border-red-100 mb-4">
                <p className="font-medium text-red-600 text-sm">处理失败：{errorMessage || '未知错误'}</p>
              </div>
              <button
                onClick={handleReset}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white py-2.5 px-4 rounded-xl font-medium transition-colors text-sm"
              >
                重新上传
              </button>
            </div>
          )}

          {/* Idle / Upload State */}
          {(state === 'idle' || state === 'uploading' || state === 'processing') && (
            <div className="animate-fade-in-up">
              
              {/* Demo Section */}
              {state === 'idle' && (
                <div className="mb-5">
                  <p className="text-xs text-slate-400 mb-2 text-center">效果示例</p>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="bg-white rounded-xl p-2 shadow-soft">
                      <p className="text-xs text-slate-400 mb-1.5">原图</p>
                      <div className="rounded-lg overflow-hidden border border-slate-100 bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center h-24">
                        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center">
                          <span className="text-xl">👤</span>
                        </div>
                      </div>
                    </div>
                    <div className="bg-white rounded-xl p-2 shadow-soft">
                      <p className="text-xs text-slate-400 mb-1.5">5秒后</p>
                      <div className="rounded-lg overflow-hidden border border-slate-100 checkerboard flex items-center justify-center h-24">
                        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center">
                          <span className="text-xl">👤</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Upload Area */}
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => state === 'idle' && fileInputRef.current?.click()}
                className={`
                  bg-white rounded-2xl border-2 border-dashed transition-all duration-300 cursor-pointer
                  ${state === 'idle' 
                    ? 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50/50' 
                    : 'border-slate-100 cursor-default'
                  }
                `}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                
                {state === 'idle' && (
                  <div className="py-10 px-8 text-center">
                    <div className="w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center mx-auto mb-3">
                      <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                    </div>
                    
                    <h2 className="text-sm font-medium text-slate-700 mb-0.5">
                      拖拽图片到这里
                    </h2>
                    <p className="text-xs text-slate-400">或点击选择文件 · 支持 JPG、PNG、WebP</p>
                  </div>
                )}

                {(state === 'uploading' || state === 'processing') && (
                  <div className="py-8 px-8">
                    {originalUrl && (
                      <div className="mb-4 max-w-xs mx-auto">
                        <img src={originalUrl} alt="Preview" className="max-h-32 mx-auto rounded-lg border border-slate-100" />
                      </div>
                    )}
                    
                    <div className="text-center">
                      <div className="w-6 h-6 border-2 border-indigo-200 border-t-indigo-500 rounded-full animate-spin mx-auto mb-2" />
                      <p className="text-xs font-medium text-slate-600">
                        {state === 'uploading' ? '上传中...' : 'AI 正在处理...'}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">预计需要 3-5 秒</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Safety & Feature hints */}
              <div className="mt-4 space-y-1.5">
                <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  图片仅本地处理 · 服务器不留存
                </div>
                <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  5秒完成 · 精准识别人物/商品/证件照
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 px-6 text-center">
        <p className="text-xs text-slate-300">AI 智能抠图 · 永久免费</p>
      </footer>
    </div>
  )
}
