'use client'

import React, { useCallback, useState } from 'react'
import { ArrowLeft, CheckCircle2, Download, RefreshCw } from 'lucide-react'
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

function ResultViewInner({
  originalUrl, resultUrl, fileName = 'image',
  onReset, onBatchReset, isBatch = false,
}: ResultViewProps) {
  const [bgType, setBgType] = useState<BgType>('transparent')
  const [customColor, setCustomColor] = useState('#dfeee4')
  const [downloading, setDownloading] = useState(false)
  const [downloadError, setDownloadError] = useState('')

  const handleReset = useCallback(() => {
    if (isBatch && onBatchReset) onBatchReset()
    else onReset()
  }, [isBatch, onBatchReset, onReset])

  const handleDownload = useCallback(async () => {
    if (downloading) return
    setDownloading(true)
    setDownloadError('')
    let temporaryUrl: string | null = null

    try {
      let targetUrl = resultUrl

      if (bgType !== 'transparent') {
        const image = new window.Image()
        await new Promise<void>((resolve, reject) => {
          image.onload = () => resolve()
          image.onerror = () => reject(new Error('The processed image could not be loaded.'))
          image.src = resultUrl
        })
        if (!image.naturalWidth || !image.naturalHeight) throw new Error('Image dimensions are invalid.')

        const canvas = document.createElement('canvas')
        canvas.width = image.naturalWidth
        canvas.height = image.naturalHeight
        const context = canvas.getContext('2d')
        if (!context) throw new Error('Your browser could not prepare a PNG image.')

        if (bgType === 'white') context.fillStyle = '#ffffff'
        else if (bgType === 'black') context.fillStyle = '#25372b'
        else context.fillStyle = /^#[0-9a-fA-F]{6}$/.test(customColor) ? customColor : '#dfeee4'
        context.fillRect(0, 0, canvas.width, canvas.height)
        context.drawImage(image, 0, 0)

        const blob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob(value => value ? resolve(value) : reject(new Error('PNG export failed. Please try again.')), 'image/png')
        })
        temporaryUrl = URL.createObjectURL(blob)
        targetUrl = temporaryUrl
      }

      const name = (fileName.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9._-]/g, '-').slice(0, 70) || 'image') + '-no-bg.png'
      const anchor = document.createElement('a')
      anchor.href = targetUrl
      anchor.download = name
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
    } catch (error) {
      setDownloadError(error instanceof Error ? error.message : 'Download failed. Please try again.')
    } finally {
      if (temporaryUrl) {
        const url = temporaryUrl
        window.setTimeout(() => URL.revokeObjectURL(url), 10000)
      }
      setDownloading(false)
    }
  }, [bgType, customColor, downloading, fileName, resultUrl])

  const background = bgType === 'transparent' ? undefined
    : bgType === 'white' ? '#fff'
    : bgType === 'black' ? '#25372b' : customColor

  return (
    <div className="rounded-2xl border border-[#dce8dc] bg-[#fbfcfa] p-4 sm:p-5" aria-live="polite">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[#236645]">
          <CheckCircle2 size={20} aria-hidden="true" />
          <h2 className="font-semibold">Your cutout is ready</h2>
        </div>
        <button type="button" onClick={handleReset} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-[#638071] hover:bg-[#eaf3ec] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#247b57]">
          <ArrowLeft size={14} aria-hidden="true" /> New image
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="min-w-0">
          <p className="mb-2 text-xs font-semibold text-[#6b8573]">Original</p>
          <div className="flex h-44 items-center justify-center overflow-hidden rounded-xl border border-[#e4ebe1] bg-[#eef1e9] sm:h-52">
            <img src={originalUrl} alt="Original uploaded image" className="h-full w-full object-contain" />
          </div>
        </div>
        <div className="min-w-0">
          <p className="mb-2 text-xs font-semibold text-[#6b8573]">Background removed</p>
          <div className={'flex h-44 items-center justify-center overflow-hidden rounded-xl border border-[#e4ebe1] sm:h-52 ' + (bgType === 'transparent' ? 'checkerboard' : '')} style={background ? { backgroundColor: background } : undefined}>
            <img src={resultUrl} alt="Image with the background removed" className="h-full w-full object-contain" />
          </div>
        </div>
      </div>

      <div className="mt-5">
        <BackgroundPicker value={bgType} customColor={customColor} onChange={setBgType} onCustomColorChange={setCustomColor} />
      </div>

      <button
        type="button"
        onClick={() => void handleDownload()}
        disabled={downloading}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[#194b3a] px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-[#28674e] disabled:cursor-wait disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#194b3a]"
      >
        <Download size={18} aria-hidden="true" />
        {downloading ? 'Preparing your PNG…' : 'Download PNG'}
      </button>
      <p className="mt-3 text-center text-xs leading-5 text-[#8a9a8d]">
        {bgType === 'transparent' ? 'Transparent PNG · Ready to use anywhere' : 'PNG with your selected background color'}
      </p>
      {downloadError && <p role="alert" className="mt-3 rounded-lg bg-[#fff0ec] p-3 text-sm text-[#9b4b35]">{downloadError}</p>}
      <button type="button" onClick={handleReset} className="mx-auto mt-4 flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold text-[#4b745e] hover:bg-[#eaf3ec]"><RefreshCw size={14} aria-hidden="true" /> Process another photo</button>
    </div>
  )
}

export const ResultView = React.memo(ResultViewInner)
