'use client'

import { Check } from 'lucide-react'

type BgType = 'transparent' | 'white' | 'black' | 'custom'

interface BackgroundPickerProps {
  value: BgType
  customColor?: string
  onChange: (value: BgType) => void
  onCustomColorChange: (color: string) => void
}

const options: Array<{ name: string; kind: BgType; color?: string }> = [
  { name: 'Transparent', kind: 'transparent' },
  { name: 'White', kind: 'white' },
  { name: 'Dark', kind: 'black' },
  { name: 'Warm sand', kind: 'custom', color: '#f3d5aa' },
  { name: 'Soft green', kind: 'custom', color: '#dfeee4' },
  { name: 'Cool gray', kind: 'custom', color: '#e5e9ed' },
]

export function BackgroundPicker({ value, customColor = '#dfeee4', onChange, onCustomColorChange }: BackgroundPickerProps) {
  return (
    <div>
      <p className="mb-3 text-xs font-semibold text-[#557462]">Preview background</p>
      <div role="group" aria-label="Choose a preview background" className="flex flex-wrap items-center gap-2.5">
        {options.map(option => {
          const selected = option.kind === 'custom'
            ? value === 'custom' && customColor.toLowerCase() === option.color
            : value === option.kind
          return (
            <button
              type="button"
              key={option.name}
              title={option.name}
              aria-label={option.name}
              aria-pressed={selected}
              onClick={() => {
                onChange(option.kind)
                if (option.color) onCustomColorChange(option.color)
              }}
              className={'relative flex h-10 w-10 items-center justify-center rounded-xl border-2 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#247b57] ' + (selected ? 'border-[#2f805c] ring-2 ring-[#d9eddf]' : 'border-[#e0e7e1] hover:border-[#80a48a]') + (option.kind === 'transparent' ? ' checkerboard' : '')}
              style={option.kind === 'white' ? { backgroundColor: '#fff' } : option.kind === 'black' ? { backgroundColor: '#25372b' } : option.color ? { backgroundColor: option.color } : undefined}
            >
              {selected && <Check size={17} strokeWidth={3} aria-hidden="true" className={option.kind === 'black' ? 'text-white' : 'text-[#20573c]'} />}
            </button>
          )
        })}
        <label title="Custom color" className={'relative flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border-2 bg-white p-1 ' + (value === 'custom' && !options.some(option => option.color?.toLowerCase() === customColor.toLowerCase()) ? 'border-[#2f805c] ring-2 ring-[#d9eddf]' : 'border-[#e0e7e1]')}>
          <span className="sr-only">Choose a custom background color</span>
          <input
            type="color"
            aria-label="Custom background color"
            value={/^#[0-9a-fA-F]{6}$/.test(customColor) ? customColor : '#dfeee4'}
            onChange={event => {
              onChange('custom')
              onCustomColorChange(event.target.value)
            }}
            className="h-7 w-7 cursor-pointer rounded-lg border-0 bg-transparent p-0"
          />
        </label>
      </div>
    </div>
  )
}
