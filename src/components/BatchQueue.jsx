import { CheckCircle, Circle, Loader, XCircle, Image as ImageIcon, Download } from 'lucide-react'

/**
 * BatchQueue — displays a list of images in the processing queue.
 * Shows thumbnail, filename, and status for each image.
 */
export default function BatchQueue({ items, selectedIndex, onSelect, onDownloadAll, allCompleted }) {
  const completedCount = items.filter(item => item.status === 'completed').length
  const totalCount = items.length

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending':
        return <Circle size={16} className="text-white/40" />
      case 'processing':
        return <Loader size={16} className="text-blue-400 animate-spin" />
      case 'completed':
        return <CheckCircle size={16} className="text-green-400" />
      case 'error':
        return <XCircle size={16} className="text-red-400" />
      default:
        return <Circle size={16} className="text-white/40" />
    }
  }

  return (
    <div className="w-72 bg-white/10 backdrop-blur-sm border-r border-white/20 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-white/20">
        <h3 className="text-white font-semibold text-lg">Batch Queue</h3>
        <p className="text-white/50 text-sm mt-1">
          {completedCount} / {totalCount} completed
        </p>
      </div>

      {/* Queue list */}
      <div className="flex-1 overflow-y-auto">
        {items.map((item, index) => (
          <div
            key={item.id}
            onClick={() => onSelect(index)}
            className={`
              flex items-center gap-3 p-3 cursor-pointer border-b border-white/10
              transition-all duration-200
              ${selectedIndex === index ? 'bg-white/20' : 'hover:bg-white/10'}
            `}
          >
            {/* Thumbnail */}
            <div className="w-12 h-12 rounded-lg overflow-hidden bg-white/10 shrink-0">
              {item.previewUrl ? (
                <img
                  src={item.previewUrl}
                  alt={item.file.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ImageIcon size={20} className="text-white/40" />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">
                {item.file.name}
              </p>
              <div className="flex items-center gap-1.5 mt-1">
                {getStatusIcon(item.status)}
                <span className="text-white/50 text-xs capitalize">
                  {item.status}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Download all button */}
      {allCompleted && (
        <div className="p-4 border-t border-white/20">
          <button
            onClick={onDownloadAll}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 
              bg-white text-purple-700 rounded-xl font-semibold text-sm
              hover:bg-white/90 transition-all duration-200 shadow-lg"
          >
            <Download size={18} />
            Download All ({completedCount})
          </button>
        </div>
      )}
    </div>
  )
}
