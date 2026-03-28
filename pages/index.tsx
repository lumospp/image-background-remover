'use client'

import { useState, useRef, useCallback } from 'react'
import Head from 'next/head'
import { ResultView } from '@/components/result-view'

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
    <>
      <Head>
        <title>AI Remove Background | Free & Instant</title>
        <meta name="description" content="Remove image backgrounds instantly with AI. Free, fast, and accurate. Perfect for product photos, portraits, and more." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="min-h-screen bg-[#0a0a0f] text-white antialiased">
        {/* Background gradient */}
        <div className="fixed inset-0 bg-gradient-to-br from-indigo-950/40 via-transparent to-purple-950/40 pointer-events-none" />
        <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/20 via-transparent to-transparent pointer-events-none" />
        
        {/* Header */}
        <header className="relative z-10 border-b border-white/5">
          <div className="max-w-5xl mx-auto px-6 py-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-white">Background Remover</h1>
                  <p className="text-xs text-white/40">AI-Powered · Free Forever</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  ✨ 100% Free
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="relative z-10 px-6 py-12">
          <div className="max-w-3xl mx-auto">
            
            {/* Hero Section */}
            <div className="text-center mb-10">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">
                Remove Background{' '}
                <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                  in Seconds
                </span>
              </h2>
              <p className="text-white/50 text-sm md:text-base max-w-lg mx-auto">
                Drop your image, get a transparent background. No signup, no watermarks, completely free.
              </p>
            </div>

            {/* Success State */}
            {state === 'success' && resultUrl && originalUrl && (
              <ResultView
                originalUrl={originalUrl}
                resultUrl={resultUrl}
                onReset={handleReset}
              />
            )}

            {/* Error State */}
            {state === 'error' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-5 mb-6">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-red-400 text-sm mb-1">Processing Failed</p>
                      <p className="text-xs text-red-400/70">{errorMessage || 'Something went wrong. Please try again.'}</p>
                    </div>
                  </div>
                </div>
                <button
                  onClick={handleReset}
                  className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl font-medium transition-all text-sm text-white/70"
                >
                  Try Again
                </button>
              </div>
            )}

            {/* Upload State */}
            {(state === 'idle' || state === 'uploading' || state === 'processing') && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                
                {/* Demo Preview */}
                {state === 'idle' && (
                  <div className="mb-6">
                    <p className="text-xs text-white/30 text-center mb-3 uppercase tracking-wider">See it in action</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-xl p-3 border border-white/5">
                        <p className="text-xs text-white/40 mb-2">Before</p>
                        <div className="rounded-lg overflow-hidden h-32 bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center">
                          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center">
                            <span className="text-2xl">👤</span>
                          </div>
                        </div>
                      </div>
                      <div className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 rounded-xl p-3 border border-emerald-500/10">
                        <p className="text-xs text-white/40 mb-2">After</p>
                        <div className="rounded-lg overflow-hidden h-32 checkerboard flex items-center justify-center">
                          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center">
                            <span className="text-2xl">👤</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Upload Zone */}
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleDrop}
                  onClick={() => state === 'idle' && fileInputRef.current?.click()}
                  className={`
                    relative bg-white/[0.02] border-2 border-dashed rounded-2xl transition-all duration-300 cursor-pointer overflow-hidden
                    ${state === 'idle' 
                      ? 'border-white/20 hover:border-indigo-400/50 hover:bg-white/[0.04]' 
                      : 'border-white/10 cursor-default'
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
                    <div className="py-16 px-8 text-center">
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/20 flex items-center justify-center mx-auto mb-5">
                        <svg className="w-8 h-8 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                      </div>
                      
                      <h3 className="text-lg font-semibold text-white mb-2">
                        Drop your image here
                      </h3>
                      <p className="text-sm text-white/40 mb-4">
                        or click to browse · JPG, PNG, WebP
                      </p>
                      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-white/50">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Max file size: 10MB
                      </div>
                    </div>
                  )}

                  {(state === 'uploading' || state === 'processing') && (
                    <div className="py-14 px-8">
                      {originalUrl && (
                        <div className="mb-5 max-w-xs mx-auto">
                          <img src={originalUrl} alt="Preview" className="max-h-40 mx-auto rounded-xl border border-white/10" />
                        </div>
                      )}
                      
                      <div className="text-center">
                        <div className="relative w-14 h-14 mx-auto mb-4">
                          <div className="absolute inset-0 rounded-full border-2 border-indigo-500/20" />
                          <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-indigo-500 animate-spin" />
                          <div className="absolute inset-2 rounded-full border-2 border-transparent border-t-purple-500 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '0.8s' }} />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-3 h-3 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500" />
                          </div>
                        </div>
                        
                        <p className="text-sm font-medium text-white mb-1">
                          {state === 'uploading' ? 'Uploading...' : 'AI Processing...'}
                        </p>
                        <p className="text-xs text-white/40">Usually takes 3-5 seconds</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Features */}
                <div className="mt-6 grid grid-cols-3 gap-3">
                  {[
                    { icon: '⚡', title: 'Lightning Fast', desc: '3-5 seconds' },
                    { icon: '🔒', title: 'Privacy Safe', desc: 'No storage' },
                    { icon: '✨', title: 'High Quality', desc: 'HD output' },
                  ].map((item, i) => (
                    <div key={i} className="bg-white/[0.02] border border-white/5 rounded-xl p-3 text-center">
                      <div className="text-lg mb-1">{item.icon}</div>
                      <p className="text-xs font-medium text-white/80">{item.title}</p>
                      <p className="text-xs text-white/30">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </main>

        {/* Footer */}
        <footer className="relative z-10 py-6 px-6 text-center border-t border-white/5">
          <p className="text-xs text-white/30">
            Built with AI · No signup required · Completely free forever
          </p>
        </footer>
      </div>

      <style jsx global>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slide-in-from-bottom-4 {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-in {
          animation: fade-in 0.4s ease-out, slide-in-from-bottom-4 0.5s ease-out;
        }
        .checkerboard {
          background-image:
            linear-gradient(45deg, #1a1a2e 25%, transparent 25%),
            linear-gradient(-45deg, #1a1a2e 25%, transparent 25%),
            linear-gradient(45deg, transparent 75%, #1a1a2e 75%),
            linear-gradient(-45deg, transparent 75%, #1a1a2e 75%);
          background-size: 16px 16px;
          background-position: 0 0, 0 8px, 8px -8px, -8px 0px;
          background-color: #0f0f1a;
        }
      `}</style>
    </>
  )
}
