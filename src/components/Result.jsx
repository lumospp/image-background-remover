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
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-5xl">
          {/* Before/After slider — hero interaction */}
          <BeforeAfterSlider
            originalUrl={originalUrl}
            resultUrl={resultUrl}
          />
        </div>
      </div>

      {/* Bottom action bar — minimal, non-distracting */}
      <div className="py-6 px-8 flex items-center justify-between gap-4 flex-wrap">
        {/* Left: status hint */}
        <div className="flex items-center gap-2 text-white/50 text-sm">
          <Sparkles size={16} className="text-yellow-300" />
          <span>Background removed successfully! Transparent PNG ready.</span>
        </div>

        {/* Right: action buttons — C1 copy applied */}
        <div className="flex items-center gap-3">
          <button
            onClick={onReset}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl
              bg-white/10 text-white border border-white/20
              font-medium text-sm hover:bg-white/20 transition-all duration-200"
          >
            <RefreshCw size={16} />
            Remove Background from Another
          </button>

          <button
            onClick={handleDownload}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl
              bg-white text-purple-700 font-semibold text-sm
              hover:bg-white/90 transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            <Download size={16} />
            Download Transparent PNG
          </button>
        </div>
      </div>
    </div>
  )
}
