'use client'

import { cn } from '@/lib/utils'
import { Check } from 'lucide-react'

type BgType = 'transparent' | 'white' | 'black' | 'custom'

const PRESET_COLORS = [
  { name: 'Transparent', value: 'transparent', pattern: 'checkerboard' },
  { name: 'White', value: 'white', bg: 'bg-white' },
  { name: 'Black', value: 'black', bg: 'bg-black' },
  { name: 'Red', value: 'custom', color: '#ef4444' },
  { name: 'Blue', value: 'custom', color: '#3b82f6' },
  { name: 'Green', value: 'custom', color: '#22c55e' },
  { name: 'Yellow', value: 'custom', color: '#eab308' },
  { name: 'Purple', value: 'custom', color: '#a855f7' },
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
              'relative w-8 h-8 rounded-lg border-2 border-gray-200 transition-all hover:scale-110',
              preset.pattern === 'checkerboard' && 'checkerboard',
              preset.bg,
              value === preset.value && preset.value !== 'custom' && 'ring-2 ring-indigo-500 ring-offset-2 ring-offset-white'
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
            className="w-8 h-8 rounded-lg border-2 border-gray-200 cursor-pointer p-0 bg-transparent"
            title="Custom color"
          />
          {value === 'custom' && (
            <div
              className="absolute inset-0 rounded-lg ring-2 ring-indigo-500 ring-offset-2 ring-offset-white pointer-events-none"
              style={{ backgroundColor: 'transparent' }}
            />
          )}
        </div>
      </div>

      {value === 'custom' && (
        <div className="flex items-center gap-2">
          <span className="text-gray-500 text-xs">Custom color:</span>
          <input
            type="text"
            value={customColor}
            onChange={(e) => {
              onChange('custom')
              onCustomColorChange(e.target.value)
            }}
            className="bg-gray-50 border border-gray-200 rounded px-2 py-1 text-gray-700 text-xs w-24 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            placeholder="#000000"
          />
          <div
            className="w-6 h-6 rounded border border-gray-200"
            style={{ backgroundColor: customColor }}
          />
        </div>
      )}
    </div>
  )
}
