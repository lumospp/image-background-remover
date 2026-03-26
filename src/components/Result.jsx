import { Download, RefreshCw } from 'lucide-react'

export default function Result({ originalUrl, resultUrl, onReset }) {
  const handleDownload = () => {
    const link = document.createElement('a')
    link.href = resultUrl
    link.download = 'removed-background.png'
    link.click()
  }

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="grid md:grid-cols-2 gap-8">
        {/* Original */}
        <div className="bg-white/10 rounded-2xl p-4">
          <h3 className="text-white/70 text-sm mb-2 font-medium">原图</h3>
          <div className="relative rounded-xl overflow-hidden bg-white/5">
            <img
              src={originalUrl}
              alt="Original"
              className="w-full h-auto"
            />
          </div>
        </div>

        {/* Result */}
        <div className="bg-white/10 rounded-2xl p-4">
          <h3 className="text-white/70 text-sm mb-2 font-medium">结果</h3>
          <div className="relative rounded-xl overflow-hidden bg-white/5">
            {/* biome-ignore lint/nursery/noImgElement: result image from API */}
            <img
              src={resultUrl}
              alt="Result"
              className="w-full h-auto"
            />
            {/* Checkerboard pattern to show transparency */}
            <div 
              className="absolute inset-0 pointer-events-none"
              style={{
                backgroundImage: 'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)',
                backgroundSize: '16px 16px',
                backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
                opacity: 0.3
              }}
            />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-center gap-4 mt-8">
        <button
          onClick={handleDownload}
          className="flex items-center gap-2 bg-white text-purple-600 px-6 py-3 rounded-xl font-semibold hover:bg-white/90 transition"
        >
          <Download size={20} />
          下载结果
        </button>
        <button
          onClick={onReset}
          className="flex items-center gap-2 bg-white/20 text-white px-6 py-3 rounded-xl font-semibold hover:bg-white/30 transition"
        >
          <RefreshCw size={20} />
          处理另一张
        </button>
      </div>
    </div>
  )
}
