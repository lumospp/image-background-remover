import { Download, RefreshCw, Sparkles } from 'lucide-react'
import { BeforeAfterSlider } from './BeforeAfterSlider'

/**
 * Result — displays the processed image with Before/After slider comparison.
 * Updated per R2 competitive analysis:
 * - Before/After slider replaces side-by-side grid (main interaction mode)
 * - Prominent CTA messaging
 * - Clean, minimal action bar
 */
export default function Result({ originalUrl, resultUrl, onReset }) {
  const handleDownload = () => {
    const link = document.createElement('a')
    link.href = resultUrl
    link.download = 'removed-background.png'
    link.click()
  }

  return (
    <div className="min-h-screen -m-8 flex flex-col">
      {/* Full-screen Before/After comparison */}
      <div className="flex-1 flex items-center justify-center p-3 sm:p-6">
        <div className="w-full max-w-5xl">
          {/* Before/After slider — hero interaction */}
          <BeforeAfterSlider
            originalUrl={originalUrl}
            resultUrl={resultUrl}
          />
        </div>
      </div>

      {/* Bottom action bar — minimal, non-distracting, mobile responsive */}
      <div className="py-4 sm:py-6 px-4 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
        {/* Left: status hint */}
        <div className="flex items-center gap-2 text-white/50 text-xs sm:text-sm">
          <Sparkles size={14} className="sm:size-4 text-yellow-300" />
          <span>Background removed! Transparent PNG ready.</span>
        </div>

        {/* Right: action buttons — C1 copy applied */}
        <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
          <button
            onClick={onReset}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1 sm:gap-2 px-3 sm:px-5 py-2.5 rounded-xl
              bg-white/10 text-white border border-white/20
              font-medium text-xs sm:text-sm hover:bg-white/20 transition-all duration-200 active:scale-95 touch:scale-95"
          >
            <RefreshCw size={14} className="sm:size-4" />
            <span className="hidden xs:inline">Remove BG from Another</span>
            <span className="xs:hidden">New</span>
          </button>

          <button
            onClick={handleDownload}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1 sm:gap-2 px-4 sm:px-6 py-2.5 rounded-xl
              bg-white text-purple-700 font-semibold text-xs sm:text-sm
              hover:bg-white/90 transition-all duration-200 shadow-lg hover:shadow-xl active:scale-95 touch:scale-95"
          >
            <Download size={14} className="sm:size-4" />
            <span className="hidden sm:inline">Download PNG</span>
            <span className="sm:hidden">Download</span>
          </button>
        </div>
      </div>
    </div>
  )
}
