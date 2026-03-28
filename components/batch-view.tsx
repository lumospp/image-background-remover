'use client'

import React, { useState, useCallback, useRef } from 'react'
import { Download, Trash2, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import { DropZone } from './drop-zone'

interface BatchFile {
  id: string
  file: File
  originalUrl: string
  resultUrl: string | null
  status: 'pending' | 'processing' | 'done' | 'error'
  error?: string
}

const MAX_BATCH = 10

async function removeBackground(file: File): Promise<Blob> {
  const formData = new FormData()
  formData.append('image', file)

  const response = await fetch('/api/removebg', {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Upload failed' }))
    throw new Error(error.error || 'Failed to remove background')
  }

  return response.blob()
}

function BatchViewInner() {
  const [files, setFiles] = useState<BatchFile[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [currentProgress, setCurrentProgress] = useState(0)
  const abortRef = useRef(false)

  const handleFilesSelected = useCallback((selectedFiles: File[]) => {
    const newFiles: BatchFile[] = selectedFiles.map((file) => ({
      id: `${file.name}-${Date.now()}-${Math.random()}`,
      file,
      originalUrl: URL.createObjectURL(file),
      resultUrl: null,
      status: 'pending',
    }))
    setFiles((prev) => [...prev, ...newFiles].slice(0, MAX_BATCH))
  }, [])

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => {
      const file = prev.find((f) => f.id === id)
      if (file) {
        URL.revokeObjectURL(file.originalUrl)
        if (file.resultUrl) URL.revokeObjectURL(file.resultUrl)
      }
      return prev.filter((f) => f.id !== id)
    })
  }, [])

  const clearAll = useCallback(() => {
    files.forEach((f) => {
      URL.revokeObjectURL(f.originalUrl)
      if (f.resultUrl) URL.revokeObjectURL(f.resultUrl)
    })
    setFiles([])
  }, [files])

  const processAll = useCallback(async () => {
    setIsProcessing(true)
    abortRef.current = false

    const pending = files.filter((f) => f.status === 'pending')
    const total = pending.length

    for (let i = 0; i < pending.length; i++) {
      if (abortRef.current) break

      const file = pending[i]
      setFiles((prev) =>
        prev.map((f) => (f.id === file.id ? { ...f, status: 'processing' } : f))
      )

      try {
        const blob = await removeBackground(file.file)
        const resultUrl = URL.createObjectURL(blob)
        setFiles((prev) =>
          prev.map((f) =>
            f.id === file.id ? { ...f, resultUrl, status: 'done' } : f
          )
        )
      } catch (err) {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === file.id
              ? { ...f, status: 'error', error: err instanceof Error ? err.message : 'Unknown error' }
              : f
          )
        )
      }

      setCurrentProgress(Math.round(((i + 1) / total) * 100))
    }

    setIsProcessing(false)
    setCurrentProgress(0)
  }, [files])

  const downloadResult = useCallback((batchFile: BatchFile) => {
    if (!batchFile.resultUrl) return
    const link = document.createElement('a')
    link.href = batchFile.resultUrl
    link.download = `removed-bg-${batchFile.file.name.replace(/\.[^.]+$/, '')}.png`
    link.click()
  }, [])

  const downloadAll = useCallback(() => {
    const doneFiles = files.filter((f) => f.status === 'done' && f.resultUrl)
    doneFiles.forEach((f, i) => {
      setTimeout(() => downloadResult(f), i * 300)
    })
  }, [files, downloadResult])

  const doneCount = files.filter((f) => f.status === 'done').length
  const errorCount = files.filter((f) => f.status === 'error').length
  const pendingCount = files.filter((f) => f.status === 'pending').length
  const hasResults = doneCount > 0 || errorCount > 0

  return (
    <div className="w-full animate-fade-in">
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-white mb-2">批量处理</h2>
        <p className="text-white/60">
          最多同时处理 {MAX_BATCH} 张图片
          {files.length > 0 && (
            <span className="ml-2">
              · 已选 {files.length} 张
              {doneCount > 0 && <span className="text-green-400 ml-1">· {doneCount} 已完成</span>}
              {errorCount > 0 && <span className="text-red-400 ml-1">· {errorCount} 失败</span>}
            </span>
          )}
        </p>
      </div>

      {/* Drop Zone — only show when no results yet */}
      {!hasResults && files.length === 0 && (
        <DropZone
          onFilesSelected={handleFilesSelected}
          multiple
          maxFiles={MAX_BATCH}
          disabled={isProcessing}
        />
      )}

      {/* Pending state: show thumbnails + process button */}
      {files.length > 0 && !hasResults && (
        <div className="space-y-6">
          {/* File Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {files.map((batchFile) => (
              <div key={batchFile.id} className="relative group">
                <div className="aspect-square rounded-xl overflow-hidden checkerboard relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={batchFile.originalUrl}
                    alt={batchFile.file.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                  {batchFile.status === 'processing' && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <Loader2 className="text-white animate-spin" size={24} />
                    </div>
                  )}
                </div>
                <button
                  onClick={() => removeFile(batchFile.id)}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow"
                >
                  <Trash2 size={12} />
                </button>
                <p className="text-white/60 text-xs mt-1 truncate">
                  {batchFile.file.name}
                </p>
              </div>
            ))}

            {/* Add more slot */}
            {files.length < MAX_BATCH && (
              <div
                onClick={() => {
                  const input = document.createElement('input')
                  input.type = 'file'
                  input.accept = 'image/jpeg,image/png,image/webp'
                  input.multiple = true
                  input.onchange = (e) => {
                    const selectedFiles = Array.from(
                      (e.target as HTMLInputElement).files || []
                    ).filter((f) => ['image/jpeg', 'image/png', 'image/webp'].includes(f.type))
                    handleFilesSelected(selectedFiles)
                  }
                  input.click()
                }}
                className="aspect-square rounded-xl border-2 border-dashed border-white/30 bg-white/5 flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-white/10 transition"
              >
                <span className="text-white/40 text-3xl">+</span>
                <span className="text-white/40 text-xs">添加更多</span>
              </div>
            )}
          </div>

          {/* Progress bar during processing */}
          {isProcessing && (
            <div className="space-y-2">
              <Progress value={currentProgress} className="h-2" />
              <p className="text-center text-white/60 text-sm">
                处理中... {currentProgress}%
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap justify-center gap-3">
            {!isProcessing && (
              <>
                {pendingCount > 0 && (
                  <Button
                    onClick={processAll}
                    className="bg-purple-500 hover:bg-purple-600 text-white"
                  >
                    开始处理 {pendingCount} 张图片
                  </Button>
                )}
                {pendingCount === 0 && doneCount > 0 && (
                  <Button
                    onClick={processAll}
                    variant="outline"
                    className="border-white/30 text-white hover:bg-white/10"
                  >
                    重新处理失败项
                  </Button>
                )}
                <Button
                  variant="ghost"
                  onClick={clearAll}
                  className="text-white/60 hover:text-white hover:bg-white/10"
                >
                  <Trash2 size={16} className="mr-2" />
                  清空全部
                </Button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Results state */}
      {hasResults && (
        <div className="space-y-6">
          {/* Results Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {files.map((batchFile) => (
              <div key={batchFile.id} className="relative group">
                {/* Image */}
                <div
                  className={cn(
                    'aspect-square rounded-xl overflow-hidden relative',
                    batchFile.status === 'done' ? 'checkerboard' : 'bg-red-500/20'
                  )}
                >
                  {batchFile.resultUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={batchFile.resultUrl}
                      alt={batchFile.file.name}
                      className="w-full h-full object-contain"
                      loading="lazy"
                      decoding="async"
                    />
                  ) : batchFile.status === 'error' ? (
                    <div className="w-full h-full flex flex-col items-center justify-center text-red-400 gap-1">
                      <XCircle size={24} />
                      <span className="text-xs text-center px-2 text-red-300">
                        {batchFile.error?.slice(0, 30)}
                      </span>
                    </div>
                  ) : batchFile.status === 'processing' ? (
                    <div className="w-full h-full flex items-center justify-center">
                      <Loader2 className="text-purple-400 animate-spin" size={28} />
                    </div>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Loader2 className="text-white/40 animate-spin" size={24} />
                    </div>
                  )}
                </div>

                {/* Overlay actions */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex flex-col items-center justify-center gap-2">
                  {batchFile.status === 'done' && (
                    <Button
                      size="sm"
                      onClick={() => downloadResult(batchFile)}
                      className="bg-purple-500 hover:bg-purple-600 text-white"
                    >
                      <Download size={14} className="mr-1" />
                      下载
                    </Button>
                  )}
                  <button
                    onClick={() => removeFile(batchFile.id)}
                    className="text-white/60 hover:text-white text-xs"
                  >
                    移除
                  </button>
                </div>

                {/* Status badge */}
                <div className="absolute top-2 left-2">
                  {batchFile.status === 'done' && (
                    <div className="bg-green-500 text-white rounded-full p-1">
                      <CheckCircle size={12} />
                    </div>
                  )}
                  {batchFile.status === 'error' && (
                    <div className="bg-red-500 text-white rounded-full p-1">
                      <XCircle size={12} />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Results Summary & Actions */}
          <div className="flex flex-wrap justify-center gap-3">
            {doneCount > 0 && (
              <Button
                onClick={downloadAll}
                className="bg-purple-500 hover:bg-purple-600 text-white"
              >
                <Download size={18} className="mr-2" />
                批量下载 ({doneCount})
              </Button>
            )}

            {pendingCount > 0 && !isProcessing && (
              <Button
                variant="outline"
                onClick={processAll}
                className="border-white/30 text-white hover:bg-white/10"
              >
                <Loader2 size={18} className="mr-2" />
                继续处理 {pendingCount} 张
              </Button>
            )}

            <Button
              variant="ghost"
              onClick={clearAll}
              className="text-white/60 hover:text-white hover:bg-white/10"
            >
              <Trash2 size={16} className="mr-2" />
              清空全部
            </Button>
          </div>

          {/* Processing progress */}
          {isProcessing && (
            <div className="space-y-2 max-w-sm mx-auto">
              <Progress value={currentProgress} className="h-2" />
              <p className="text-center text-white/60 text-sm">
                处理中... {currentProgress}%
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Memoize to prevent re-renders when parent state changes but files don't
export const BatchView = React.memo(BatchViewInner)
