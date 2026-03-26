import { useState } from 'react'
import { Scissors, AlertCircle } from 'lucide-react'
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
  }

  const remaining = FREE_QUOTA - usageCount

  return (
    <div className="min-h-screen p-8">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-3 text-white mb-2">
          <Scissors size={40} />
          <h1 className="text-4xl font-bold">Image Background Remover</h1>
        </div>
        <p className="text-white/70">使用 AI 一键移除图片背景</p>
        <div className="mt-4 inline-flex items-center gap-2 bg-white/20 text-white px-4 py-2 rounded-full text-sm">
          剩余次数: <span className="font-bold">{remaining}</span>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-2xl mx-auto">
        {error && (
          <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-4 mb-6 flex items-center gap-3 text-white">
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        )}

        {!resultUrl ? (
          <div className="space-y-6">
            <DropZone onFileSelect={handleFileSelect} disabled={loading || remaining <= 0} />

            {file && (
              <div className="text-center text-white/70">
                <p>已选择: {file.name}</p>
                {loading && <p className="mt-2 animate-pulse">正在移除背景...</p>}
              </div>
            )}

            {remaining <= 0 && (
              <p className="text-center text-white/70">
                免费次数已用完
              </p>
            )}
          </div>
        ) : (
          <Result
            originalUrl={originalUrl}
            resultUrl={resultUrl}
            onReset={handleReset}
          />
        )}
      </div>

      {/* Footer */}
      <footer className="text-center text-white/50 text-sm mt-12">
        Powered by Remove.bg API • Built with Cloudflare
      </footer>
    </div>
  )
}
