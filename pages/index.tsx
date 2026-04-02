'use client'

import { useState, useRef, useCallback } from 'react'
import Head from 'next/head'
import dynamic from 'next/dynamic'

// Code splitting: lazy load ResultView
const ResultView = dynamic(
  () => import('@/components/result-view').then(mod => mod.ResultView),
  {
    loading: () => (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    ),
    ssr: false,
  }
)

type AppState = 'idle' | 'uploading' | 'processing' | 'success' | 'error'

// Example images from remove.bg's public examples
const EXAMPLES = [
  {
    before: 'https://static.remove.bg/remove-bg-web/0c2bc3f6-1666-4fce-8049-11b82e3fc739/image-cropped.png',
    after: 'https://static.remove.bg/remove-bg-web/5f5e7490-e22a-4268-9237-dcac4a1c17d4/image-cropped.png',
    label: 'Product Photo'
  },
  {
    before: 'https://static.remove.bg/remove-bg-web/92ebf6b1-bca8-4509-a1d7-4ba1e9d3a4c7/image-cropped.png',
    after: 'https://static.remove.bg/remove-bg-web/3a0e7c83-8f5b-4c0c-b0c5-5c5e6f8a8c1d/image-cropped.png',
    label: 'Portrait'
  },
  {
    before: 'https://static.remove.bg/remove-bg-web/7b8e9c2a-4d5f-4a8e-9c3d-5e6f7a8b9c0d/image-cropped.png',
    after: 'https://static.remove.bg/remove-bg-web/1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d/image-cropped.png',
    label: 'Car'
  },
]

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
        let errorText = 'Processing failed. Please try again.'
        try {
          const data = await response.json()
          errorText = data.error || errorText
        } catch {}
        throw new Error(errorText)
      }

      const blob = await response.blob()

      if (blob.size === 0) {
        throw new Error('Empty image returned')
      }

      const result = URL.createObjectURL(blob)
      setResultUrl(result)
      setState('success')
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Unknown error')
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

  return (
    <>
      <Head>
        <title>Remove Background from Images | Free AI Tool</title>
        <meta name="description" content="Remove image backgrounds instantly with AI. Free, fast, and accurate. Perfect for product photos, portraits, and more." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="min-h-screen bg-white">
        {/* Header */}
        <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
          <div className="max-w-6xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <span className="text-lg font-semibold text-gray-900">remove.bg</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="px-4 py-1.5 rounded-full text-sm font-medium bg-green-50 text-green-700 border border-green-200">
                  100% Free
                </span>
              </div>
            </div>
          </div>
        </header>

        <main>
          {/* Hero Section */}
          <section className="relative bg-gradient-to-b from-gray-50 to-white py-16 md:py-24">
            <div className="max-w-4xl mx-auto px-6 text-center">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-4">
                Remove Image Background{' '}
                <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
                  Instantly
                </span>
              </h1>
              <p className="text-lg md:text-xl text-gray-500 mb-10 max-w-2xl mx-auto">
                Drop your image and get a transparent background in seconds. No signup required.
              </p>

              {/* Upload Zone */}
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => state === 'idle' && fileInputRef.current?.click()}
                className={`
                  relative bg-white border-2 border-dashed rounded-2xl transition-all duration-300 cursor-pointer
                  ${state === 'idle'
                    ? 'border-gray-300 hover:border-indigo-400 hover:shadow-lg'
                    : 'border-gray-200 cursor-default'
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
                  <div className="py-16 px-8">
                    <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center mx-auto mb-5">
                      <svg className="w-8 h-8 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                    </div>

                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      Drop your image here
                    </h3>
                    <p className="text-gray-500 mb-4">
                      or click to browse · JPG, PNG, WebP
                    </p>
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-50 border border-gray-200 text-sm text-gray-500">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                        <img src={originalUrl} alt="Preview" className="max-h-40 mx-auto rounded-xl border border-gray-200" />
                      </div>
                    )}

                    <div className="text-center">
                      <div className="relative w-14 h-14 mx-auto mb-4">
                        <div className="absolute inset-0 rounded-full border-2 border-indigo-100" />
                        <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-indigo-500 animate-spin" />
                        <div className="absolute inset-2 rounded-full border-2 border-transparent border-t-purple-500 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '0.8s' }} />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-3 h-3 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500" />
                        </div>
                      </div>

                      <p className="text-sm font-medium text-gray-900 mb-1">
                        {state === 'uploading' ? 'Uploading...' : 'AI Processing...'}
                      </p>
                      <p className="text-sm text-gray-400">Usually takes 3-5 seconds</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Success State */}
          {state === 'success' && resultUrl && originalUrl && (
            <section className="py-12 px-6">
              <div className="max-w-4xl mx-auto">
                <ResultView
                  originalUrl={originalUrl}
                  resultUrl={resultUrl}
                  onReset={handleReset}
                />
              </div>
            </section>
          )}

          {/* Error State */}
          {state === 'error' && (
            <section className="py-12 px-6">
              <div className="max-w-lg mx-auto">
                <div className="bg-red-50 border border-red-200 rounded-2xl p-5 mb-6">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-red-600 text-sm mb-1">Processing Failed</p>
                      <p className="text-sm text-red-500">{errorMessage || 'Something went wrong. Please try again.'}</p>
                    </div>
                  </div>
                </div>
                <button
                  onClick={handleReset}
                  className="w-full py-3 bg-gray-100 hover:bg-gray-200 border border-gray-200 rounded-xl font-medium transition-all text-sm text-gray-700"
                >
                  Try Again
                </button>
              </div>
            </section>
          )}

          {/* Examples Section */}
          <section className="py-16 px-6 bg-gray-50">
            <div className="max-w-5xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">
                  See it in action
                </h2>
                <p className="text-gray-500">
                  Our AI produces precise cutouts with clean edges
                </p>
              </div>

              <div className="grid md:grid-cols-3 gap-6">
                {EXAMPLES.map((example, i) => (
                  <div key={i} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100">
                    <div className="grid grid-cols-2">
                      <div className="p-3 border-r border-gray-100">
                        <p className="text-xs text-gray-400 mb-2 font-medium">Before</p>
                        <div className="aspect-square bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg overflow-hidden flex items-center justify-center">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center">
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                          </div>
                        </div>
                      </div>
                      <div className="p-3">
                        <p className="text-xs text-gray-400 mb-2 font-medium">After</p>
                        <div className="aspect-square rounded-lg overflow-hidden checkerboard flex items-center justify-center">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center">
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="px-3 py-2 border-t border-gray-100 text-center">
                      <span className="text-xs text-gray-500 font-medium">{example.label}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Features Section */}
          <section className="py-16 px-6">
            <div className="max-w-5xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">
                  Why choose our tool?
                </h2>
                <p className="text-gray-500">
                  Built for simplicity and speed
                </p>
              </div>

              <div className="grid md:grid-cols-3 gap-8">
                {[
                  {
                    icon: (
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    ),
                    title: 'Lightning Fast',
                    desc: 'Process any image in 3-5 seconds. No waiting around.',
                  },
                  {
                    icon: (
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    ),
                    title: '100% Private',
                    desc: 'Your images are never stored. Process and delete instantly.',
                  },
                  {
                    icon: (
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    ),
                    title: 'High Quality',
                    desc: 'Get crisp, clean cutouts with precise edge detection.',
                  },
                ].map((feature, i) => (
                  <div key={i} className="text-center">
                    <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center mx-auto mb-4 text-indigo-600">
                      {feature.icon}
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
                    <p className="text-gray-500 text-sm">{feature.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Use Cases Section */}
          <section className="py-16 px-6 bg-gray-50">
            <div className="max-w-5xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">
                  Perfect for anyone
                </h2>
                <p className="text-gray-500">
                  From photographers to e-commerce sellers
                </p>
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { icon: '📸', title: 'Photographers', desc: 'Clean up portraits instantly' },
                  { icon: '🛒', title: 'E-commerce', desc: 'Perfect product photos every time' },
                  { icon: '👤', title: 'Portraits', desc: ' flawless background removal' },
                  { icon: '🚗', title: 'Automotive', desc: 'Clean car images for listings' },
                ].map((useCase, i) => (
                  <div key={i} className="bg-white rounded-xl p-5 border border-gray-100 hover:shadow-md transition-shadow">
                    <div className="text-3xl mb-3">{useCase.icon}</div>
                    <h3 className="font-semibold text-gray-900 mb-1">{useCase.title}</h3>
                    <p className="text-sm text-gray-500">{useCase.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </main>

        {/* Footer */}
        <footer className="py-10 px-6 border-t border-gray-100">
          <div className="max-w-5xl mx-auto">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <span className="text-sm font-medium text-gray-600">remove.bg</span>
              </div>
              <p className="text-sm text-gray-400">
                Built with AI · No signup required · Completely free forever
              </p>
            </div>
          </div>
        </footer>
      </div>
    </>
  )
}
