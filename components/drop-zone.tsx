'use client'

import { useCallback, useState, useRef } from 'react'
import { Upload, Image as ImageIcon, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DropZoneProps {
  onFilesSelected: (files: File[]) => void
  disabled?: boolean
  multiple?: boolean
  maxFiles?: number
}

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export function DropZone({
  onFilesSelected,
  disabled = false,
  multiple = false,
  maxFiles = 10,
}: DropZoneProps) {
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      if (disabled) return

      const files = Array.from(e.dataTransfer.files).filter((f) =>
        ACCEPTED_TYPES.includes(f.type)
      )
      if (files.length > 0) {
        onFilesSelected(multiple ? files.slice(0, maxFiles) : [files[0]])
      }
    },
    [onFilesSelected, disabled, multiple, maxFiles]
  )

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (disabled || !e.target.files) return
      const files = Array.from(e.target.files).filter((f) =>
        ACCEPTED_TYPES.includes(f.type)
      )
      if (files.length > 0) {
        onFilesSelected(multiple ? files.slice(0, maxFiles) : [files[0]])
      }
      // Reset input so same file can be selected again
      e.target.value = ''
    },
    [onFilesSelected, disabled, multiple, maxFiles]
  )

  const handleClick = () => {
    if (!disabled) {
      inputRef.current?.click()
    }
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault()
        if (!disabled) setIsDragging(true)
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      onClick={handleClick}
      className={cn(
        'relative border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-200 select-none',
        isDragging && !disabled
          ? 'border-purple-400 bg-purple-500/20 drop-zone-active'
          : 'border-purple-400/50 bg-white/5 hover:bg-white/10',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(',')}
        multiple={multiple}
        onChange={handleFileInput}
        className="hidden"
        disabled={disabled}
      />

      <div className="flex flex-col items-center gap-4 text-white">
        {isDragging ? (
          <ImageIcon size={64} className="text-purple-400 animate-bounce" />
        ) : (
          <Upload size={64} className="text-purple-400/70" />
        )}
        <div>
          <p className="text-xl font-semibold">
            {isDragging ? '释放图片' : '拖拽图片到这里'}
          </p>
          <p className="text-white/60 mt-2">
            {multiple ? `或点击选择文件（最多 ${maxFiles} 张）` : '或点击选择文件'}
          </p>
          <p className="text-white/40 mt-1 text-sm">
            支持 JPG、PNG、WebP
          </p>
        </div>
      </div>
    </div>
  )
}

// Preview thumbnail for batch
export function FilePreview({
  file,
  onRemove,
}: {
  file: File
  onRemove?: () => void
}) {
  const [url, setUrl] = useState<string | null>(null)

  // Create object URL for preview
  if (!url) {
    const objectUrl = URL.createObjectURL(file)
    setUrl(objectUrl)
  }

  return (
    <div className="relative group">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url!}
        alt={file.name}
        className="w-full h-full object-cover rounded-lg"
      />
      {onRemove && (
        <button
          onClick={onRemove}
          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <X size={12} />
        </button>
      )}
    </div>
  )
}
