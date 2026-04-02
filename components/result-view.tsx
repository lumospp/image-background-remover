'use client'

import React, { useState, useCallback, useMemo, useRef } from 'react'
import { Download, RefreshCw, ArrowLeft, Palette } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { BackgroundPicker } from './background-picker'

interface ResultViewProps {
  originalUrl: string
  resultUrl: string
  fileName?: string
  onReset: () => void
  onBatchReset?: () => void
  isBatch?: boolean
}

type BgType = 'transparent' | 'white' | 'black' | 'custom'
type CustomColor = string

function ResultViewInner({
  originalUrl,
  resultUrl,
  fileName,
  onReset,
  onBatchReset,
  isBatch = false,
}: ResultViewProps) {
  const [bgType, setBgType] = useState<BgType>('transparent')
  const [customColor, setCustomColor] = useState<CustomColor>('#3b82f6')

  // Use refs to avoid stale closures in handleDownload
  const bgTypeRef = useRef(bgType)
  const customColorRef = useRef(customColor)
  bgTypeRef.current = bgType
  customColorRef.current = customColor

  const handleDownload = useCallback(async () => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const img = new window.Image()
    img.crossOrigin = 'anonymous'

    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = reject
      img.src = resultUrl
    })

    canvas.width = img.naturalWidth
    canvas.height = img.naturalHeight

    // Use refs to get current state values
    const currentBgType = bgTypeRef.current
    const currentCustomColor = customColorRef.current

    // Draw background
    if (currentBgType === 'white') {
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
    } else if (currentBgType === 'black') {
      ctx.fillStyle = '#000000'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
    } else if (currentBgType === 'custom') {
      ctx.fillStyle = currentCustomColor
      ctx.fillRect(0, 0, canvas.width, canvas.height)
    }
    // 'transparent' → no background drawn (keeps alpha)

    // Draw result image on top
    ctx.drawImage(img, 0, 0)

    canvas.toBlob((blob) => {
      if (!blob) return
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `removed-background-${Date.now()}.png`
      link.click()
      setTimeout(() => URL.revokeObjectURL(url), 5000)
    }, 'image/png')
  }, [resultUrl])

  // Memoize background class to avoid recalc on every render
  const bgContainerClass = useMemo(() => {
    if (bgType === 'transparent') return 'checkerboard'
    if (bgType === 'white') return 'bg-white'
    if (bgType === 'black') return 'bg-black'
    return ''
  }, [bgType])

  const bgStyle = useMemo(() => {
    if (bgType === 'custom') return { backgroundColor: customColor }
    return undefined
  }, [bgType, customColor])

  const handleBgChange = useCallback((value: BgType) => {
    setBgType(value)
  }, [])

  const handleCustomColorChange = useCallback((color: string) => {
    setCustomColor(color)
  }, [])

  const handleReset = useCallback(() => {
    if (isBatch && onBatchReset) {
      onBatchReset()
    } else {
      onReset()
    }
  }, [isBatch, onReset, onBatchReset])

  return (
    <div className="w-full animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={handleReset}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft size={16} />
          {isBatch ? 'Back to batch' : 'Process new image'}
        </button>

        {fileName && (
          <p className="text-gray-500 text-sm truncate max-w-xs">{fileName}</p>
        )}
      </div>

      {/* Image Comparison */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Original */}
        <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200">
          <h3 className="text-gray-500 text-sm mb-3 font-medium">Original</h3>
          <div className="relative rounded-xl overflow-hidden bg-gray-100">
            <img
              src={originalUrl}
              alt="Original"
              className="w-full h-auto"
              loading="lazy"
              decoding="async"
            />
          </div>
        </div>

        {/* Result with Background Options */}
        <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-gray-500 text-sm font-medium">Result</h3>
            <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-gray-100">
              <Palette size={12} className="text-gray-400 mr-1" />
              <span className="text-xs text-gray-600">Background</span>
            </div>
          </div>

          <div
            className={`relative rounded-xl overflow-hidden ${bgContainerClass}`}
            style={bgStyle}
          >
            <img
              src={resultUrl}
              alt="Result"
              className="w-full h-auto relative z-10"
              loading="lazy"
              decoding="async"
            />
          </div>

          {/* Background Picker */}
          <div className="mt-3">
            <BackgroundPicker
              value={bgType}
              customColor={customColor}
              onChange={handleBgChange}
              onCustomColorChange={handleCustomColorChange}
            />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap justify-center gap-3 mt-8">
        <button
          onClick={handleDownload}
          className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl transition-colors shadow-lg shadow-indigo-500/20"
        >
          <Download size={18} />
          Download PNG
        </button>
        <button
          onClick={handleReset}
          className="inline-flex items-center gap-2 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition-colors border border-gray-200"
        >
          <RefreshCw size={18} />
          {isBatch ? 'Continue batch' : 'Process another'}
        </button>
      </div>
    </div>
  )
}

// Wrap with React.memo to prevent re-renders when parent re-renders
// but props don't actually change (ResultView is loaded dynamically anyway)
export const ResultView = React.memo(ResultViewInner)
