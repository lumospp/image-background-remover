import { useCallback, useState } from 'react'
import { Upload, Image as ImageIcon } from 'lucide-react'

export default function DropZone({ onFileSelect, disabled }) {
  const [isDragging, setIsDragging] = useState(false)

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setIsDragging(false)
    if (disabled) return

    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith('image/')) {
      onFileSelect(file)
    }
  }, [onFileSelect, disabled])

  const handleClick = () => {
    if (disabled) return
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = (e) => {
      const file = e.target.files[0]
      if (file) onFileSelect(file)
    }
    input.click()
  }

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      onClick={handleClick}
      className={`
        border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer
        transition-all duration-200
        ${isDragging ? 'border-white bg-white/20' : 'border-white/50 bg-white/10'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white/20'}
      `}
    >
      <div className="flex flex-col items-center gap-4 text-white">
        {isDragging ? (
          <ImageIcon size={64} className="animate-bounce" />
        ) : (
          <Upload size={64} />
        )}
        <div>
          <p className="text-xl font-semibold">
            {isDragging ? '释放图片' : '拖拽图片到这里'}
          </p>
          <p className="text-white/70 mt-2">或点击选择文件</p>
        </div>
      </div>
    </div>
  )
}
