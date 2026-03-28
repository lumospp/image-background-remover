import { useState } from 'react'
import { Scissors, AlertCircle, Zap } from 'lucide-react'
import DropZone from './components/DropZone'
import Result from './components/Result'
import { removeBackground } from './lib/api'

const FREE_QUOTA = 50

export default function App() {
  const [file, setFile] = useState(null)
  const [originalUrl, setOriginalUrl] = useState(null)
  const [resultUrl, setResultUrl] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [usageCount, setUsageCount] = useState(0)
  // Category selection (for UI display only — does not affect API)
  const [category, setCategory] = useState('people')

  const remaining = FREE_QUOTA - usageCount

  /**
   * handleFileSelect — processes the selected image:
   * 1. Shows immediate preview (originalUrl)
   * 2. Calls Remove.bg API
   * 3. On success: sets resultUrl, increments usageCount
   * 4. On error: shows error banner
   *
   * NOTE: category is for UI UX only. Remove.bg API currently accepts
   * only the image file. Category tagging is future enhancement.
   */
  const handleFileSelect = async (selectedFile) => {
    setFile(selectedFile)
    setOriginalUrl(URL.createObjectURL(selectedFile))
    setResultUrl(null)
    setError(null)
    setLoading(true)

    try {
      const blob = await removeBackground(selectedFile)
      const url = URL.createObjectURL(blob)
      setResultUrl(url)
      setUsageCount((c) => c + 1)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setFile(null)
    setOriginalUrl(null)
    setResultUrl(null)
    setError(null)
    setCategory('people')
  }

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
      {/* ============================================================
          STATE 1: Show Result (full-screen Before/After experience)
          Triggered after successful background removal
      ============================================================ */}
      {resultUrl && !loading ? (
        <Result
          originalUrl={originalUrl}
          resultUrl={resultUrl}
          onReset={handleReset}
        />
      ) : (
        /* ============================================================
           STATE 2: Upload / Processing state
           Full-viewport hero with drag-drop zone
        ============================================================ */
        <>
          {/* ---- Top bar: logo + free trial badge ---- */}
          <div className="relative z-10 flex items-center justify-between px-8 py-6">
            {/* Logo */}
            <div className="flex items-center gap-3 text-white">
              <Scissors size={28} />
              <span className="text-xl font-bold tracking-tight hidden sm:inline">
                BG Remover
              </span>
            </div>

            {/* FREE TRIAL badge — prominent per R2 competitive analysis */}
            <div className="flex items-center gap-2">
              <div className={`
                flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold
                transition-all duration-300
                ${remaining > 0
                  ? 'bg-yellow-400 text-yellow-900 shadow-lg shadow-yellow-400/30'
                  : 'bg-white/20 text-white/70'
                }
              `}>
                <Zap size={16} fill={remaining > 0 ? 'currentColor' : 'none'} />
                {remaining > 0 ? (
                  <span>
                    🎁 {remaining} FREE — no credit card needed
                  </span>
                ) : (
                  <span>All credits used — Sign up for more</span>
                )}
              </div>
            </div>
          </div>

          {/* ---- Error banner (if any) ---- */}
          {error && (
            <div className="max-w-2xl mx-auto px-6 mb-4 z-20 relative">
              <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-4
                flex items-center gap-3 text-white">
                <AlertCircle size={20} className="shrink-0" />
                <span>{error}</span>
              </div>
            </div>
          )}

          {/* ---- Loading overlay — shown while API processes ---- */}
          {loading ? (
            <div className="relative z-10 flex flex-col items-center justify-center min-h-[calc(100vh-100px)] gap-6 px-6">
              {/* Pulsing preview of selected image */}
              <div className="relative w-64 h-64 rounded-2xl overflow-hidden bg-white/10 border border-white/20">
                {originalUrl && (
                  <img
                    src={originalUrl}
                    alt="Uploading"
                    className="w-full h-full object-contain opacity-50"
                  />
                )}
                {/* Processing overlay */}
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/30 gap-3">
                  <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                  <p className="text-white/80 text-sm font-medium">
                    Processing... Takes about 5 seconds
                  </p>
                </div>
              </div>

              {/* File name */}
              {file && (
                <p className="text-white/50 text-sm max-w-xs truncate text-center">
                  {file.name}
                </p>
              )}
            </div>
          ) : (
            /* ---- Full-screen drop zone ---- */
            <DropZone
              onFileSelect={handleFileSelect}
              disabled={remaining <= 0}
              category={category}
              onCategoryChange={setCategory}
            />
          )}

          {/* ---- Footer ---- */}
          <footer className="relative z-10 text-center text-white/40 text-xs py-6">
            Made for small e-commerce sellers · 100% Free to Start
          </footer>
        </>
      )}
    </div>
  )
}
