import { useState, useRef, useCallback } from 'react'
import { Upload, Image as ImageIcon } from 'lucide-react'

/**
 * SceneCategory component — lets user pick an image category before uploading.
 * Category is stored in parent state but does NOT affect API call (Remove.bg handles it internally).
 */
export function SceneCategory({ selected, onChange }) {
  const categories = [
    { id: 'people', label: 'People' },
    { id: 'product', label: 'Product' },
    { id: 'car', label: 'Car' },
    { id: 'animals', label: 'Animals' },
  ]

  return (
    <div className="flex flex-wrap justify-center gap-2 mb-8">
      {categories.map((cat) => (
        <button
          key={cat.id}
          onClick={() => onChange(cat.id)}
          className={`
            px-4 py-1.5 rounded-full text-sm font-medium border transition-all duration-200
            ${selected === cat.id
              ? 'bg-white text-purple-700 border-white shadow-md'
              : 'bg-white/10 text-white border-white/30 hover:bg-white/20'
            }
          `}
        >
          {cat.label}
        </button>
      ))}
    </div>
  )
}

/**
 * DropZone — full-viewport hero upload zone.
 * - Drag & drop or click to select
 * - Animated icon feedback on drag
 * - Disabled state when quota exhausted or processing
 * - Supports multiple file selection for batch processing
 */
export default function DropZone({ onFileSelect, onFilesSelect, disabled, category, onCategoryChange, multiple, remaining }) {
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef(null)

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setIsDragging(false)
    if (disabled) return

    if (multiple) {
      const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'))
      if (files.length > 0) {
        onFilesSelect(files)
      }
    } else {
      const file = e.dataTransfer.files[0]
      if (file && file.type.startsWith('image/')) {
        onFileSelect(file)
      }
    }
  }, [onFileSelect, onFilesSelect, disabled, multiple])

  const handleClick = () => {
    if (disabled) return
    inputRef.current?.click()
  }

  const handleFileChange = (e) => {
    if (multiple) {
      const files = Array.from(e.target.files)
      if (files.length > 0) onFilesSelect(files)
    } else {
      const file = e.target.files[0]
      if (file) onFileSelect(file)
    }
  }

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      onClick={handleClick}
      touch-action="manipulation"
      className={`
        relative flex flex-col items-center justify-center
        min-h-screen -m-8 px-4 sm:px-6 cursor-pointer
        transition-all duration-300 select-none
        ${disabled ? 'opacity-60 cursor-not-allowed' : 'hover:opacity-95 active:scale-[0.98]'}
      `}
    >
      {/* Subtle radial glow behind content */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className={`
          w-96 h-96 rounded-full blur-3xl transition-all duration-500
          ${isDragging ? 'bg-white/30 scale-110' : 'bg-white/10 scale-100'}
        `} />
      </div>

      {/* Main card content — mobile responsive */}
      <div className={`
        relative z-10 flex flex-col items-center gap-4 sm:gap-6
        border-2 border-dashed rounded-3xl p-8 sm:p-12 md:p-16 w-full max-w-2xl
        transition-all duration-300
        ${isDragging
          ? 'border-white bg-white/15 scale-[1.02]'
          : 'border-white/40 bg-white/5 hover:border-white/70 hover:bg-white/10'
        }
        ${disabled ? 'cursor-not-allowed' : ''}
      `}>
        {/* Animated icon */}
        <div className={`
          w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-2xl flex items-center justify-center
          bg-white/10 backdrop-blur-sm
          transition-all duration-300
          ${isDragging ? 'scale-110 bg-white/20' : ''}
        `}>
          {isDragging ? (
            <ImageIcon size={36} className="sm:text-4xl md:text-5xl text-white animate-bounce" />
          ) : (
            <Upload size={36} className="sm:text-4xl md:text-5xl text-white/80" />
          )}
        </div>

        {/* Heading — C1 copy applied */}
        <div className="text-center space-y-2 px-2">
          <h2 className="text-2xl sm:text-3xl font-bold text-white">
            {isDragging
              ? 'Release to add images'
              : multiple
                ? 'Drop your images here for batch processing'
                : 'Drop your product image here'
            }
          </h2>
          <p className="text-white/60 text-base sm:text-lg">
            {isDragging
              ? '...'
              : multiple
                ? `Select multiple images · ${remaining > 0 ? `${remaining} free credits` : 'No credits left'}`
                : 'Takes about 5 seconds · No account required'
            }
          </p>
        </div>

        {/* Scene category pills */}
        <div className="pt-2">
          <SceneCategory selected={category} onChange={onCategoryChange} />
        </div>

        {/* Hidden file input — mobile optimized with capture for camera */}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple={multiple}
          capture="environment"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {/* File format hint */}
      <p className="relative z-10 mt-4 text-white/40 text-sm">
        Supports JPG, PNG, WebP · Max 10MB
      </p>
    </div>
  )
}
