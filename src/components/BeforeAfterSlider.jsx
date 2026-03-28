import { useState, useRef, useCallback } from 'react'

/**
 * BeforeAfterSlider — interactive drag/slide comparison between original and result.
 * Shows transparency checkerboard under the result layer.
 * Fully touch-friendly.
 */
export function BeforeAfterSlider({ originalUrl, resultUrl }) {
  const [sliderX, setSliderX] = useState(50) // percentage 0-100
  const containerRef = useRef(null)
  const isDragging = useRef(false)

  const getPosition = useCallback((clientX) => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return 50
    const x = ((clientX - rect.left) / rect.width) * 100
    return Math.min(100, Math.max(0, x))
  }, [])

  const handleMouseDown = (e) => {
    e.preventDefault()
    isDragging.current = true
    setSliderX(getPosition(e.clientX))

    const onMove = (e) => {
      if (!isDragging.current) return
      setSliderX(getPosition(e.clientX))
    }
    const onUp = () => {
      isDragging.current = false
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  const handleTouchMove = (e) => {
    setSliderX(getPosition(e.touches[0].clientX))
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full rounded-2xl overflow-hidden select-none cursor-col-resize"
      style={{ aspectRatio: 'auto', maxHeight: '65vh' }}
      onMouseDown={handleMouseDown}
      onTouchMove={(e) => handleTouchMove(e.touches[0].clientX)}
      onTouchStart={(e) => setSliderX(getPosition(e.touches[0].clientX))}
    >
      {/* Checkerboard canvas behind result */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(45deg, #b0b0b0 25%, transparent 25%), ' +
            'linear-gradient(-45deg, #b0b0b0 25%, transparent 25%), ' +
            'linear-gradient(45deg, transparent 75%, #b0b0b0 75%), ' +
            'linear-gradient(-45deg, transparent 75%, #b0b0b0 75%)',
          backgroundSize: '20px 20px',
          backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
        }}
      />

      {/* Result layer (full width, clipped) */}
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ clipPath: `inset(0 0 0 ${sliderX}%)` }}
      >
        {/* biome-ignore lint/nursery/noImgElement: result image from API */}
        <img
          src={resultUrl}
          alt="Result (background removed)"
          className="w-full h-full object-contain"
          draggable={false}
        />
      </div>

      {/* Original layer (always full width, slightly dimmed so result pops) */}
      <div className="relative">
        {/* biome-ignore lint/nursery/noImgElement: original user image */}
        <img
          src={originalUrl}
          alt="Original"
          className="w-full h-full object-contain"
          draggable={false}
        />
      </div>

      {/* Slider handle — vertical line + knob */}
      <div
        className="absolute top-0 bottom-0 w-1 bg-white shadow-lg cursor-col-resize z-10"
        style={{ left: `${sliderX}%`, transform: 'translateX(-50%)' }}
      >
        {/* Knob */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
          w-10 h-10 rounded-full bg-white shadow-xl flex items-center justify-center
          text-purple-700 font-bold text-lg select-none"
        >
          ⇄
        </div>
      </div>

      {/* Labels */}
      <div className="absolute bottom-3 left-3 z-10 px-3 py-1 rounded-lg bg-black/50 text-white text-xs font-medium backdrop-blur-sm">
        Before
      </div>
      <div className="absolute bottom-3 right-3 z-10 px-3 py-1 rounded-lg bg-black/50 text-white text-xs font-medium backdrop-blur-sm">
        After
      </div>
    </div>
  )
}
