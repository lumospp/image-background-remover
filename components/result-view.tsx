'use client'

import { useState, useCallback } from 'react'
import { Download, RefreshCw, ArrowLeft, Palette } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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

export function ResultView({
  originalUrl,
  resultUrl,
  fileName,
  onReset,
  onBatchReset,
  isBatch = false,
}: ResultViewProps) {
  const [bgType, setBgType] = useState<BgType>('transparent')
  const [customColor, setCustomColor] = useState<CustomColor>('#3b82f6')

  const handleDownload = useCallback(() => {
    const link = document.createElement('a')
    link.href = resultUrl
    link.download = `removed-background-${Date.now()}.png`
    link.click()
  }, [resultUrl])

  // Compose the final display image with background
  const displayResult = bgType === 'transparent' ? resultUrl : resultUrl

  const bgStyle = () => {
    if (bgType === 'transparent') return undefined
    if (bgType === 'white') return 'bg-white'
    if (bgType === 'black') return 'bg-black'
    if (bgType === 'custom') return `bg-[${customColor}]`
    return undefined
  }

  return (
    <div className="w-full animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={isBatch ? onBatchReset : onReset}
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
            />
          </div>
        </div>

        {/* Result with Background Options */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-white/60 text-sm font-medium">结果</h3>
            <Tabs defaultValue="transparent" className="w-auto" onValueChange={(v) => setBgType(v as BgType)}>
              <TabsList className="bg-white/10 h-8">
                <TabsTrigger value="transparent" className="text-xs px-2 py-1 h-7 data-[state=active]:bg-white/20">
                  <Palette size={12} className="mr-1" />
                  背景
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div
            className={`relative rounded-xl overflow-hidden ${
              bgType === 'transparent'
                ? 'checkerboard'
                : bgType === 'white'
                ? 'bg-white'
                : bgType === 'black'
                ? 'bg-black'
                : ''
            }`}
            style={bgType === 'custom' ? { backgroundColor: customColor } : undefined}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={resultUrl}
              alt="Result"
              className="w-full h-auto relative z-10"
            />
          </div>

          {/* Background Picker */}
          <div className="mt-3">
            <BackgroundPicker
              value={bgType}
              customColor={customColor}
              onChange={setBgType}
              onCustomColorChange={setCustomColor}
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
          onClick={isBatch ? onBatchReset : onReset}
          className="border-white/30 text-white hover:bg-white/10 hover:text-white"
        >
          <RefreshCw size={18} className="mr-2" />
          {isBatch ? '继续批量处理' : '处理另一张'}
        </Button>
      </div>
    </div>
  )
}
