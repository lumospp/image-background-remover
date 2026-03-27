'use client'

import { cn } from '@/lib/utils'
import { Check } from 'lucide-react'

type BgType = 'transparent' | 'white' | 'black' | 'custom'

const PRESET_COLORS = [
  { name: '透明', value: 'transparent', pattern: 'checkerboard' },
  { name: '白色', value: 'white', bg: 'bg-white' },
  { name: '黑色', value: 'black', bg: 'bg-black' },
  { name: '红色', value: 'custom', color: '#ef4444' },
  { name: '蓝色', value: 'custom', color: '#3b82f6' },
  { name: '绿色', value: 'custom', color: '#22c55e' },
  { name: '黄色', value: 'custom', color: '#eab308' },
  { name: '紫色', value: 'custom', color: '#a855f7' },
]

interface BackgroundPickerProps {
  value: BgType
  customColor?: string
  onChange: (value: BgType) => void
  onCustomColorChange: (color: string) => void
}

export function BackgroundPicker({
  value,
  customColor,
  onChange,
  onCustomColorChange,
}: BackgroundPickerProps) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {PRESET_COLORS.map((preset) => (
          <button
            key={preset.name}
            onClick={() => {
              onChange(preset.value as BgType)
              if (preset.value === 'custom' && preset.color) {
                onCustomColorChange(preset.color)
              }
            }}
            className={cn(
              'relative w-8 h-8 rounded-lg border-2 border-white/20 transition-all hover:scale-110',
              preset.pattern === 'checkerboard' && 'checkerboard',
              preset.bg,
              value === preset.value && preset.value !== 'custom' && 'ring-2 ring-purple-400 ring-offset-2 ring-offset-background'
            )}
            style={
              preset.color
                ? { backgroundColor: preset.color }
                : undefined
            }
            title={preset.name}
          >
            {value === preset.value && (
              <Check
                size={14}
                className={cn(
                  'absolute inset-0 m-auto',
                  preset.value === 'black' || preset.color === '#3b82f6' || preset.color === '#22c55e'
                    ? 'text-white'
                    : 'text-black'
                )}
              />
            )}
          </button>
        ))}

        {/* Custom color picker */}
        <div className="relative">
          <input
            type="color"
            value={customColor || '#3b82f6'}
            onChange={(e) => {
              onChange('custom')
              onCustomColorChange(e.target.value)
            }}
            className="w-8 h-8 rounded-lg border-2 border-white/20 cursor-pointer p-0 bg-transparent"
            title="自定义颜色"
          />
          {value === 'custom' && (
            <div
              className="absolute inset-0 rounded-lg ring-2 ring-purple-400 ring-offset-2 ring-offset-background pointer-events-none"
              style={{ backgroundColor: 'transparent' }}
            />
          )}
        </div>
      </div>

      {value === 'custom' && (
        <div className="flex items-center gap-2">
          <span className="text-white/60 text-xs">自定义颜色:</span>
          <input
            type="text"
            value={customColor}
            onChange={(e) => {
              onChange('custom')
              onCustomColorChange(e.target.value)
            }}
            className="bg-white/10 border border-white/20 rounded px-2 py-1 text-white text-xs w-24 focus:outline-none focus:ring-1 focus:ring-purple-400"
            placeholder="#000000"
          />
          <div
            className="w-6 h-6 rounded border border-white/20"
            style={{ backgroundColor: customColor }}
          />
        </div>
      )}
    </div>
  )
}
