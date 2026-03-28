'use client'

import React, { useState, useCallback, useMemo, useRef } from 'react'
import { Download, RefreshCw, ArrowLeft, Palette } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TabsList, TabsTrigger } from '@/components/ui/tabs'
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

  const handleTabChange = useCallback((v: string) => {
    setBgType(v as BgType)
  }, [])

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
        <Button
          variant="ghost"
          size="sm"
          onClick={handleReset}
          className="text-white hover:text-white hover:bg-white/20"
        >
          <ArrowLeft size={16} className="mr-2" />
          {isBatch ? '返回批量处理' : '处理新图片'}
        </Button>

        {fileName && (
          <p className="text-white/60 text-sm truncate max-w-xs">{fileName}</p>
        )}
      </div>

      {/* Image Comparison */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Original */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
          <h3 className="text-white/60 text-sm mb-3 font-medium">原图</h3>
          <div className="relative rounded-xl overflow-hidden bg-white/5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
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
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-white/60 text-sm font-medium">结果</h3>
            <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/10">
              <Palette size={12} className="text-white/50 mr-1" />
              <span className="text-xs text-white/70">背景</span>
            </div>
          </div>

          <div
            className={`relative rounded-xl overflow-hidden ${bgContainerClass}`}
            style={bgStyle}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
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
        <Button
          onClick={handleDownload}
          className="bg-purple-500 hover:bg-purple-600 text-white"
        >
          <Download size={18} className="mr-2" />
          下载 PNG
        </Button>
        <Button
          variant="outline"
          onClick={handleReset}
          className="border-white/30 text-white hover:bg-white/10 hover:text-white"
        >
          <RefreshCw size={18} className="mr-2" />
          {isBatch ? '继续批量处理' : '处理另一张'}
        </Button>
      </div>
    </div>
  )
}

// Wrap with React.memo to prevent re-renders when parent re-renders
// but props don't actually change (ResultView is loaded dynamically anyway)
export const ResultView = React.memo(ResultViewInner)
